# sentinel.ps1 — Autonomous test-and-fix runner for SilkRoadDuo
# Usage: pwsh scripts/sentinel.ps1 [-Loops 3] [-Lang sogdian] [-Topic greetings]
# Launches the emulator test loop: screenshot → detect issues → fix → retest

param(
    [int]$Loops     = 3,
    [string]$Lang   = "sogdian",
    [string]$Topic  = "greetings",
    [switch]$NoFix
)

$adb     = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$AppUrl  = "exp://10.0.0.208:8081"
$TmpDir  = "$env:TEMP\sentinel"
$AppDir  = $PSScriptRoot | Split-Path -Parent
$LogFile = "$AppDir\scripts\sentinel.log"

New-Item -ItemType Directory -Force $TmpDir | Out-Null

function Log($msg) {
    $ts = Get-Date -Format "HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content $LogFile $line
}

function EmulatorOnline() {
    $out = & $adb devices 2>$null
    return ($out -match "emulator-5554\s+device")
}

function Screenshot($name) {
    $raw    = "$TmpDir\$name.png"
    $scaled = "$TmpDir\${name}_s.png"

    if (-not (EmulatorOnline)) {
        Log "  [screenshot] emulator offline, skipping $name"
        return $null
    }

    & $adb -s emulator-5554 shell screencap -p /sdcard/ss.png 2>$null
    & $adb -s emulator-5554 pull /sdcard/ss.png $raw 2>$null

    if (-not (Test-Path $raw) -or (Get-Item $raw).Length -lt 1000) {
        Log "  [screenshot] pull failed or empty for $name"
        return $null
    }

    try {
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Image]::FromFile($raw)
        $bmp = New-Object System.Drawing.Bitmap(540, 1212)
        $g   = [System.Drawing.Graphics]::FromImage($bmp)
        $g.DrawImage($img, 0, 0, 540, 1212)
        $bmp.Save($scaled)
        $g.Dispose(); $img.Dispose(); $bmp.Dispose()
        return $scaled
    } catch {
        Log "  [screenshot] resize failed: $_, using raw"
        return $raw
    }
}

function Tap($x, $y) {
    if (-not (EmulatorOnline)) { return }
    $rx = [int]($x * 2); $ry = [int]($y * 2)
    & $adb -s emulator-5554 shell input tap $rx $ry
}

function Swipe($x1, $y1, $x2, $y2, $ms=300) {
    if (-not (EmulatorOnline)) { return }
    $rx1=[int]($x1*2); $ry1=[int]($y1*2); $rx2=[int]($x2*2); $ry2=[int]($y2*2)
    & $adb -s emulator-5554 shell input swipe $rx1 $ry1 $rx2 $ry2 $ms
}

function CheckForKnownIssues($screenshotPath) {
    $issues = @()
    if ($null -eq $screenshotPath -or -not (Test-Path $screenshotPath)) {
        $issues += "SCREENSHOT_FAILED"
        return $issues
    }
    $fileSize = (Get-Item $screenshotPath).Length
    # < 40KB after 30s wait = still on loading screen or blank
    if ($fileSize -lt 40000) { $issues += "LOADING_TIMEOUT" }
    return $issues
}

function LaunchApp() {
    Log "Launching app via deep link..."
    & $adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d $AppUrl host.exp.exponent 2>$null
    Start-Sleep -Seconds 10
}

function WaitForEmulator($timeoutSec = 60) {
    Log "Waiting for emulator to come online..."
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (EmulatorOnline) {
            # Also wait for Android input service to be ready
            $boot = & $adb -s emulator-5554 shell getprop sys.boot_completed 2>$null
            if ($boot -match "1") { Log "  Emulator online and boot complete."; return $true }
        }
        Start-Sleep 3
    }
    Log "  Emulator did not come online within ${timeoutSec}s"
    return $false
}

function EnsureMetroRunning() {
    $conn = Get-NetTCPConnection -LocalPort 8081 -EA SilentlyContinue
    if ($conn) { return }
    Log "Metro not running on :8081 — starting it..."
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Set-Location '$AppDir'; npx expo start --android" -WindowStyle Normal
    Log "  Waiting 25s for Metro to bundle..."
    Start-Sleep 25
}

function RunTestLoop() {
    $results = @()
    for ($loop = 1; $loop -le $Loops; $loop++) {
        Log "=== Loop $loop / $Loops ==="

        if (-not (EmulatorOnline)) {
            Log "Emulator offline at loop start — waiting..."
            if (-not (WaitForEmulator 60)) {
                $results += [PSCustomObject]@{ Loop=$loop; Screen=$null; Issues="EMULATOR_OFFLINE"; Pass=$false }
                continue
            }
        }

        EnsureMetroRunning
        LaunchApp
        $ss = Screenshot "loop${loop}_home"
        Log "Home screenshot: $ss"

        # Navigate to lesson
        Swipe 270 700 270 500 300; Start-Sleep 1
        Swipe 270 700 270 500 300; Start-Sleep 1
        Tap 462 500   # Sogdian arrow
        Start-Sleep -Seconds 2
        Tap 270 363   # Greetings
        Log "Waiting for lesson to generate (30s)..."
        Start-Sleep -Seconds 30

        $ss = Screenshot "loop${loop}_lesson"
        $issues = CheckForKnownIssues $ss
        Log "Issues detected: $(if ($issues.Count -eq 0) { 'none' } else { $issues -join ', ' })"

        $results += [PSCustomObject]@{
            Loop    = $loop
            Screen  = $ss
            Issues  = $issues -join ','
            Pass    = ($issues.Count -eq 0)
        }

        if ($issues.Count -gt 0 -and -not $NoFix) {
            Log "Attempting auto-fix for: $($issues -join ', ')"
            foreach ($issue in $issues) {
                switch ($issue) {
                    "LOADING_TIMEOUT" {
                        # Soft fix: reload the JS bundle without restarting Metro
                        # (Metro restart can take the emulator offline)
                        Log "  → Sending reload keystroke (r) to Metro..."
                        $metroProc = Get-Process -Name "node" -EA SilentlyContinue | Where-Object {
                            $_.CommandLine -like "*expo*"
                        } | Select-Object -First 1
                        if ($metroProc) {
                            # Press 'r' in the Metro terminal to trigger a reload
                            [console]::OpenStandardInput() | Out-Null  # no-op, Metro runs in separate window
                        }
                        # Instead: use adb to send 'r' to trigger dev menu reload
                        & $adb -s emulator-5554 shell input keyevent 82 2>$null  # open dev menu
                        Start-Sleep 2
                        & $adb -s emulator-5554 shell input tap 540 450 2>$null  # Reload
                        Start-Sleep 10
                    }
                    "SCREENSHOT_FAILED" {
                        Log "  → Screenshot failed — waiting for emulator to stabilise..."
                        Start-Sleep 10
                    }
                }
            }
        }

        # Go back to home for next loop
        if (EmulatorOnline) {
            & $adb -s emulator-5554 shell input keyevent 4  # back
            Start-Sleep 2
            & $adb -s emulator-5554 shell input keyevent 4
            Start-Sleep 2
        }
    }

    return $results
}

# ── Main ──────────────────────────────────────────────────────────────────────
Log "Sentinel starting — $Loops loop(s), lang=$Lang, topic=$Topic"
$results = RunTestLoop

$passed = ($results | Where-Object Pass).Count
$failed = $Loops - $passed
Log ""
Log "=== RESULTS: $passed/$Loops passed, $failed failed ==="
$results | Format-Table Loop, Pass, Issues -AutoSize

if ($failed -gt 0) { exit 1 }
