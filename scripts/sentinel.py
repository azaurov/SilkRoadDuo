#!/usr/bin/env python3
# sentinel.py — Autonomous test-and-fix runner for SilkRoadDuo
# Usage: python3 scripts/sentinel.py [--loops 3] [--lang sogdian] [--topic greetings]
#                                     [--device <adb-serial>] [--no-fix] [--no-release]
# --device defaults to whichever device `adb devices` reports online (e.g. a
# phone paired over wireless adb), falling back to the emulator-5554 AVD.

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
TMP_DIR = Path("/tmp/sentinel")
LOG_FILE = APP_DIR / "scripts" / "sentinel.log"
REPORT_FILE = APP_DIR / "scripts" / "sentinel_report.json"

# Tap/swipe coordinates below were calibrated against a 1080px-wide emulator
# screen (x*2 point->pixel convention). REFERENCE_WIDTH_PX + DEVICE_SCALE let
# the same coordinates track proportionally on any other device/resolution.
REFERENCE_WIDTH_PX = 1080

# Populated by detect_device() in main() — never hardcode "emulator-5554"
# below this point so a physical device (e.g. over wireless adb) works too.
DEVICE_SERIAL = None
DEVICE_SCALE = 1.0
APP_URL = "exp://10.0.2.2:8081"  # overwritten for non-emulator devices
LAUNCH_MODE = "expo_go"  # "expo_go" (deep link into host.exp.exponent, needs Metro)
                          # or "standalone" (launch the installed release/local build directly)
STANDALONE_PACKAGE = "com.silkroadduo.app"

# (lang tap coords, topic tap coords, label) — covers each exercise type at
# least once across a run: greetings/food lessons mix mcq/match/fillblank/
# wordarrange per the fixed buildPrompt() ordering in App.js.
ROUTES = [
    {"lang": "sogdian",  "lang_tap": (462, 500), "topic": "greetings", "topic_tap": (270, 363)},
    {"lang": "farsi",    "lang_tap": (270, 500), "topic": "food",      "topic_tap": (270, 460)},
]

# JS-side failure signatures worth flagging from logcat — RN redboxes,
# unhandled promise rejections, and this app's own console.warn/error calls.
# NOTE: these only fire for things that actually get logged. App.js's AI-
# fetch failures (fetchLesson's throw new Error(...)) are caught and shown
# only via React state (setError) — never console.error'd — so they are
# invisible to logcat in *both* debug and release builds. See
# ON_SCREEN_ERROR_PATTERNS below, which reads the rendered screen instead.
JS_ERROR_PATTERNS = [
    "ReactNativeJS.*Error",
    "Unhandled promise rejection",
    "console.error",
    "TypeError:",
    "\\[profiles\\].*failed",
]

# Substrings of the actual setError()/throw messages in App.js's fetchLesson
# (see lines building "All AI backends are rate-limited...", "<status>: <msg>",
# "Unknown error..."). Matched against the on-screen text pulled via
# `uiautomator dump`, since these never reach logcat.
ON_SCREEN_ERROR_PATTERNS = [
    "does not exist or you do not have access",
    "All AI backends are rate-limited",
    "Unknown error. Check Expo logs",
    "Battle server unavailable",
    r"^\d{3}: ",  # "<http status>: <message>" from fetchLesson's throw
]

# LessonScreen's exerciseLabel strings (App.js) — any one of these on screen
# means a lesson genuinely loaded. File-size-based detection was unreliable:
# a fully-loaded lesson can render mostly blank space below a short prompt
# card and compress to a tiny PNG, misreading as a timeout.
LESSON_SCREEN_MARKERS = [
    "What does this mean?",
    "How do you say this?",
    "Fill in the blank",
    "Match the pairs",
    "Arrange the words",
    "Complete the exercise",
]

TMP_DIR.mkdir(parents=True, exist_ok=True)


def find_adb():
    if shutil.which("adb"):
        return "adb"
    candidate = Path.home() / "Android/Sdk/platform-tools/adb"
    if candidate.exists():
        return str(candidate)
    sys.exit("ERROR: adb not found. Install android-tools-adb or Android SDK platform-tools.")


ADB = find_adb()


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def run(cmd, **kwargs):
    return subprocess.run(cmd, capture_output=True, text=True, **kwargs)


def list_device_serials():
    r = run([ADB, "devices"])
    serials = []
    for line in r.stdout.splitlines()[1:]:
        parts = line.split()
        if len(parts) == 2 and parts[1] == "device":
            serials.append(parts[0])
    return serials


def detect_device(preferred=None):
    """Pick which connected device/emulator to drive. Prefers an explicit
    --device serial, then any already-online device, falling back to the
    default AVD serial (which wait_for_device will then wait to come up)."""
    serials = list_device_serials()
    if preferred:
        if preferred not in serials:
            log(f"WARNING: requested device '{preferred}' not in `adb devices` yet — will wait for it.")
        return preferred
    if serials:
        return serials[0]
    return "emulator-5554"


def device_online():
    return DEVICE_SERIAL in list_device_serials()


def wait_for_device(timeout=60):
    log(f"Waiting for device {DEVICE_SERIAL} to come online...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        if device_online():
            r = run([ADB, "-s", DEVICE_SERIAL, "shell", "getprop", "sys.boot_completed"])
            if r.stdout.strip() == "1":
                log("  Device online and boot complete.")
                return True
        time.sleep(3)
    log(f"  Device did not come online within {timeout}s")
    return False


def installed_packages(serial):
    r = run([ADB, "-s", serial, "shell", "pm", "list", "packages"])
    return r.stdout


def configure_device(serial):
    """Set DEVICE_SERIAL/DEVICE_SCALE/APP_URL/LAUNCH_MODE for whichever device we're driving."""
    global DEVICE_SERIAL, DEVICE_SCALE, APP_URL, LAUNCH_MODE
    DEVICE_SERIAL = serial

    packages = installed_packages(serial)
    has_expo_go = "host.exp.exponent" in packages
    has_standalone = STANDALONE_PACKAGE in packages
    if not has_expo_go and has_standalone:
        LAUNCH_MODE = "standalone"
        log(f"Device {serial}: Expo Go not installed, driving the installed "
            f"standalone build ({STANDALONE_PACKAGE}) directly — no Metro needed.")
    else:
        LAUNCH_MODE = "expo_go"

    r = run([ADB, "-s", serial, "shell", "wm", "size"])
    width_px = REFERENCE_WIDTH_PX
    m = re.search(r"(\d+)x(\d+)", r.stdout)
    if m:
        width_px = int(m.group(1))
    DEVICE_SCALE = width_px / REFERENCE_WIDTH_PX
    log(f"Device {serial}: width={width_px}px, scale={DEVICE_SCALE:.3f}")

    if serial.startswith("emulator-"):
        APP_URL = "exp://10.0.2.2:8081"
    else:
        # Physical device (e.g. over wireless adb) can't reach the host via
        # 10.0.2.2 — needs the host's real LAN IP that routes to the device.
        host_ip = None
        ip_match = re.match(r"^(\d+\.\d+\.\d+\.\d+):\d+$", serial)
        if ip_match:
            route = run(["ip", "route", "get", ip_match.group(1)])
            src_match = re.search(r"src (\S+)", route.stdout)
            if src_match:
                host_ip = src_match.group(1)
        if not host_ip:
            hosts = run(["hostname", "-I"]).stdout.split()
            host_ip = hosts[0] if hosts else "127.0.0.1"
        APP_URL = f"exp://{host_ip}:8081"
        log(f"Physical device detected — Metro URL set to {APP_URL}")


def adb(*args):
    return run([ADB, "-s", DEVICE_SERIAL, "shell"] + list(args))


def tap(x, y):
    if not device_online():
        return
    adb("input", "tap", str(round(x * 2 * DEVICE_SCALE)), str(round(y * 2 * DEVICE_SCALE)))


def swipe(x1, y1, x2, y2, ms=300):
    if not device_online():
        return
    adb("input", "swipe",
        str(round(x1 * 2 * DEVICE_SCALE)), str(round(y1 * 2 * DEVICE_SCALE)),
        str(round(x2 * 2 * DEVICE_SCALE)), str(round(y2 * 2 * DEVICE_SCALE)), str(ms))


def screenshot(name):
    raw = TMP_DIR / f"{name}.png"
    scaled = TMP_DIR / f"{name}_s.png"

    if not device_online():
        log(f"  [screenshot] device offline, skipping {name}")
        return None

    # /sdcard is not writable by the shell user on newer (scoped-storage)
    # emulator images — /data/local/tmp always is.
    adb("screencap", "-p", "/data/local/tmp/ss.png")
    run([ADB, "-s", DEVICE_SERIAL, "pull", "/data/local/tmp/ss.png", str(raw)])

    if not raw.exists() or raw.stat().st_size < 1000:
        log(f"  [screenshot] pull failed or empty for {name}")
        return None

    if shutil.which("convert"):
        r = run(["convert", str(raw), "-resize", "540x1212!", str(scaled)])
        if r.returncode == 0 and scaled.exists():
            return scaled

    return raw


def check_issues(path):
    issues = []
    if path is None or not path.exists():
        issues.append("SCREENSHOT_FAILED")
    return issues


def check_lesson_loaded(screen_text):
    """True if any known exerciseLabel string (App.js) is on screen — the
    reliable signal that a lesson actually rendered, regardless of how much
    blank space is below it."""
    return any(marker in t for t in screen_text for marker in LESSON_SCREEN_MARKERS)


def clear_logcat():
    if device_online():
        run([ADB, "-s", DEVICE_SERIAL, "logcat", "-c"])


def capture_js_errors():
    """Pull recent logcat and flag lines matching known JS-failure signatures.
    Returns (issue_found: bool, excerpt: list[str])."""
    if not device_online():
        return False, []
    r = run([ADB, "-s", DEVICE_SERIAL, "logcat", "-d", "-t", "500"])
    pattern = re.compile("|".join(JS_ERROR_PATTERNS))
    hits = [line for line in r.stdout.splitlines() if pattern.search(line)]
    return (len(hits) > 0), hits[-20:]


def capture_screen_text():
    """Dump the current screen's accessibility tree and pull out every
    visible text string — this is how we catch failures that only ever
    surface as rendered UI (e.g. App.js's setError() banner), which never
    reach logcat in either debug or release builds."""
    if not device_online():
        return []
    adb("uiautomator", "dump", "/data/local/tmp/ui.xml")
    dump_path = TMP_DIR / "ui.xml"
    r = run([ADB, "-s", DEVICE_SERIAL, "pull", "/data/local/tmp/ui.xml", str(dump_path)])
    if r.returncode != 0 or not dump_path.exists():
        return []
    xml = dump_path.read_text(errors="ignore")
    return [t for t in re.findall(r'text="([^"]*)"', xml) if t]


def check_on_screen_errors(screen_text):
    """Match rendered screen text against known App.js error-banner strings.
    Returns (issue_found: bool, matches: list[str])."""
    if not screen_text:
        return False, []
    pattern = re.compile("|".join(ON_SCREEN_ERROR_PATTERNS))
    matches = [t for t in screen_text if pattern.search(t)]
    return (len(matches) > 0), matches


def launch_app():
    if LAUNCH_MODE == "standalone":
        log(f"Launching installed standalone build ({STANDALONE_PACKAGE})...")
        adb("am", "start", "-n", f"{STANDALONE_PACKAGE}/.MainActivity")
    else:
        log("Launching app via Expo Go deep link...")
        adb("am", "start", "-a", "android.intent.action.VIEW", "-d", APP_URL, "host.exp.exponent")
    time.sleep(10)


def metro_running():
    r = run(["ss", "-tlnp"])
    return ":8081" in r.stdout


def ensure_metro():
    if metro_running():
        return
    log("Metro not running on :8081 — starting it...")
    metro_log = TMP_DIR / "metro.log"
    subprocess.Popen(
        ["npx", "expo", "start", "--android"],
        cwd=str(APP_DIR),
        stdout=open(metro_log, "w"),
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    log("  Waiting 25s for Metro to bundle...")
    time.sleep(25)


def run_test_loop(loops, no_fix):
    passed = 0
    failed = 0
    report = []

    for loop in range(1, loops + 1):
        route = ROUTES[(loop - 1) % len(ROUTES)]
        log(f"=== Loop {loop} / {loops} — lang={route['lang']} topic={route['topic']} ===")
        entry = {"loop": loop, "lang": route["lang"], "topic": route["topic"], "issues": [], "screenshots": []}

        if not device_online():
            log("Device offline at loop start — waiting...")
            if not wait_for_device(60):
                log("  RESULT: DEVICE_OFFLINE (fail)")
                entry["issues"] = ["DEVICE_OFFLINE"]
                report.append(entry)
                failed += 1
                continue

        if LAUNCH_MODE != "standalone":
            ensure_metro()
        clear_logcat()
        launch_app()

        ss = screenshot(f"loop{loop}_home")
        log(f"Home screenshot: {ss}")
        if ss:
            entry["screenshots"].append(str(ss))

        swipe(270, 700, 270, 500, 300); time.sleep(1)
        swipe(270, 700, 270, 500, 300); time.sleep(1)
        tap(*route["lang_tap"])
        time.sleep(2)
        tap(*route["topic_tap"])
        log("Waiting for lesson to generate (30s)...")
        time.sleep(30)

        ss = screenshot(f"loop{loop}_lesson")
        if ss:
            entry["screenshots"].append(str(ss))
        issues = check_issues(ss)

        screen_text = capture_screen_text()

        if not check_lesson_loaded(screen_text):
            issues.append("LOADING_TIMEOUT")

        js_error, js_excerpt = capture_js_errors()
        if js_error:
            issues.append("JS_ERROR")
            entry["logcat_excerpt"] = js_excerpt

        on_screen_error, on_screen_matches = check_on_screen_errors(screen_text)
        if on_screen_error:
            issues.append("AI_BACKEND_ERROR")
            entry["on_screen_error"] = on_screen_matches

        entry["issues"] = issues

        if not issues:
            log("Issues detected: none")
            log("  RESULT: PASS")
            passed += 1
        else:
            log(f"Issues detected: {', '.join(issues)}")
            log("  RESULT: FAIL")
            failed += 1

            if not no_fix:
                log(f"Attempting auto-fix for: {', '.join(issues)}")
                for issue in issues:
                    if issue == "LOADING_TIMEOUT":
                        log("  → Sending reload via adb dev menu...")
                        adb("input", "keyevent", "82")   # open dev menu
                        time.sleep(2)
                        tap(270, 225)  # Reload
                        time.sleep(10)
                    elif issue == "SCREENSHOT_FAILED":
                        log("  → Screenshot failed — waiting for emulator to stabilise...")
                        time.sleep(10)
                    elif issue == "JS_ERROR":
                        log("  → JS error detected in logcat — see sentinel_report.json for excerpt. "
                            "Not auto-patching code from a black-box symptom; needs a reviewed fix.")
                    elif issue == "AI_BACKEND_ERROR":
                        log("  → AI-backend error banner detected on screen — see sentinel_report.json "
                            "for the matched text. Not auto-patching; needs a reviewed fix.")

        report.append(entry)

        if device_online():
            adb("input", "keyevent", "4"); time.sleep(2)  # back
            adb("input", "keyevent", "4"); time.sleep(2)

    REPORT_FILE.write_text(json.dumps({
        "generated_at": datetime.now().isoformat(),
        "passed": passed,
        "failed": failed,
        "loops": report,
    }, indent=2))
    log(f"Report written to {REPORT_FILE}")

    return passed, failed


def create_github_release():
    version = json.loads((APP_DIR / "package.json").read_text())["version"]
    tag = f"v{version}"

    # Skip if release already exists
    r = run(["gh", "release", "view", tag], cwd=str(APP_DIR))
    if r.returncode == 0:
        log(f"  Release {tag} already exists — skipping")
        return

    # Create annotated tag (ignore error if it already exists locally)
    run(["git", "-C", str(APP_DIR), "tag", "-a", tag, "-m", f"Release {tag}"])
    push = run(["git", "-C", str(APP_DIR), "push", "origin", tag])
    if push.returncode != 0:
        log(f"  Tag push failed: {push.stderr.strip()}")

    sha = run(["git", "-C", str(APP_DIR), "rev-parse", "--short", "HEAD"]).stdout.strip()
    notes = f"Sentinel: {tag} — all tests passed ✓\n\nCommit: {sha}"
    r = run(["gh", "release", "create", tag,
             "--title", tag,
             "--notes", notes,
             "--target", "master"],
            cwd=str(APP_DIR))
    if r.returncode == 0:
        log(f"  GitHub release {tag} created")
    else:
        log(f"  Release creation failed: {r.stderr.strip()}")


def main():
    parser = argparse.ArgumentParser(description="SilkRoadDuo device/emulator test loop")
    parser.add_argument("--loops",      type=int, default=3,     help="Number of test loops")
    parser.add_argument("--lang",       default="sogdian",       help="Language id")
    parser.add_argument("--topic",      default="greetings",     help="Topic id")
    parser.add_argument("--device",     default=None,            help="adb serial to drive (default: first online device, else emulator-5554)")
    parser.add_argument("--no-fix",     action="store_true",     help="Skip auto-fix attempts")
    parser.add_argument("--no-release", action="store_true",     help="Skip GitHub release creation")
    args = parser.parse_args()

    serial = detect_device(args.device)
    configure_device(serial)
    if not device_online():
        wait_for_device(60)

    log(f"Sentinel starting — device={DEVICE_SERIAL}, {args.loops} loop(s), lang={args.lang}, topic={args.topic}")
    passed, failed = run_test_loop(args.loops, args.no_fix)

    log("")
    log(f"=== RESULTS: {passed}/{args.loops} passed, {failed} failed ===")

    if failed == 0 and not args.no_release:
        log("All tests passed — creating GitHub release...")
        create_github_release()

    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
