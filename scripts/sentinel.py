#!/usr/bin/env python3
# sentinel.py — Autonomous test-and-fix runner for SilkRoadDuo
# Usage: python3 scripts/sentinel.py [--loops 3] [--lang sogdian] [--topic greetings] [--no-fix] [--no-release]

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
TMP_DIR = Path("/tmp/sentinel")
LOG_FILE = APP_DIR / "scripts" / "sentinel.log"
APP_URL = "exp://10.0.2.2:8081"

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


def emulator_online():
    r = run([ADB, "devices"])
    return "emulator-5554\tdevice" in r.stdout


def wait_for_emulator(timeout=60):
    log("Waiting for emulator to come online...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        if emulator_online():
            r = run([ADB, "-s", "emulator-5554", "shell", "getprop", "sys.boot_completed"])
            if r.stdout.strip() == "1":
                log("  Emulator online and boot complete.")
                return True
        time.sleep(3)
    log(f"  Emulator did not come online within {timeout}s")
    return False


def adb(*args):
    return run([ADB, "-s", "emulator-5554", "shell"] + list(args))


def tap(x, y):
    if not emulator_online():
        return
    adb("input", "tap", str(x * 2), str(y * 2))


def swipe(x1, y1, x2, y2, ms=300):
    if not emulator_online():
        return
    adb("input", "swipe", str(x1 * 2), str(y1 * 2), str(x2 * 2), str(y2 * 2), str(ms))


def screenshot(name):
    raw = TMP_DIR / f"{name}.png"
    scaled = TMP_DIR / f"{name}_s.png"

    if not emulator_online():
        log(f"  [screenshot] emulator offline, skipping {name}")
        return None

    adb("screencap", "-p", "/sdcard/ss.png")
    run([ADB, "-s", "emulator-5554", "pull", "/sdcard/ss.png", str(raw)])

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
    if path.stat().st_size < 40000:
        issues.append("LOADING_TIMEOUT")
    return issues


def launch_app():
    log("Launching app via deep link...")
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

    for loop in range(1, loops + 1):
        log(f"=== Loop {loop} / {loops} ===")

        if not emulator_online():
            log("Emulator offline at loop start — waiting...")
            if not wait_for_emulator(60):
                log("  RESULT: EMULATOR_OFFLINE (fail)")
                failed += 1
                continue

        ensure_metro()
        launch_app()

        ss = screenshot(f"loop{loop}_home")
        log(f"Home screenshot: {ss}")

        swipe(270, 700, 270, 500, 300); time.sleep(1)
        swipe(270, 700, 270, 500, 300); time.sleep(1)
        tap(462, 500)   # Sogdian arrow
        time.sleep(2)
        tap(270, 363)   # Greetings
        log("Waiting for lesson to generate (30s)...")
        time.sleep(30)

        ss = screenshot(f"loop{loop}_lesson")
        issues = check_issues(ss)

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
                        adb("input", "tap", "540", "450")  # Reload
                        time.sleep(10)
                    elif issue == "SCREENSHOT_FAILED":
                        log("  → Screenshot failed — waiting for emulator to stabilise...")
                        time.sleep(10)

        if emulator_online():
            adb("input", "keyevent", "4"); time.sleep(2)  # back
            adb("input", "keyevent", "4"); time.sleep(2)

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
    parser = argparse.ArgumentParser(description="SilkRoadDuo emulator test loop")
    parser.add_argument("--loops",      type=int, default=3,     help="Number of test loops")
    parser.add_argument("--lang",       default="sogdian",       help="Language id")
    parser.add_argument("--topic",      default="greetings",     help="Topic id")
    parser.add_argument("--no-fix",     action="store_true",     help="Skip auto-fix attempts")
    parser.add_argument("--no-release", action="store_true",     help="Skip GitHub release creation")
    args = parser.parse_args()

    log(f"Sentinel starting — {args.loops} loop(s), lang={args.lang}, topic={args.topic}")
    passed, failed = run_test_loop(args.loops, args.no_fix)

    log("")
    log(f"=== RESULTS: {passed}/{args.loops} passed, {failed} failed ===")

    if failed == 0 and not args.no_release:
        log("All tests passed — creating GitHub release...")
        create_github_release()

    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
