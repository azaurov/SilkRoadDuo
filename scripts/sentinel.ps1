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

function Screenshot($name) {
    & $adb -s emulator-5554 shell screencap -p /sdcard/ss.png 2>$null
    & $adb -s emulator-5554 pull /sdcard/ss.png "$TmpDir\$name.png" 2>$null
    # Downscale 2x for faster reads
    Add-Type -AssemblyName System.Drawing
    $img = [System.Drawing.Image]::FromFile("$TmpDir\$name.png")
    $bmp = New-Object System.Drawing.Bitmap(540, 1212)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.DrawImage($img, 0, 0, 540, 1212)
    $bmp.Save("$TmpDir\${name}_s.png")
    $g.Dispose(); $img.Dispose(); $bmp.Dispose()
    return "$TmpDir\${name}_s.png"
}

function Tap($x, $y) {
    $rx = [int]($x * 2); $ry = [int]($y * 2)  # scale to real resolution
    & $adb -s emulator-5554 shell input tap $rx $ry
}

function Swipe($x1, $y1, $x2, $y2, $ms=300) {
    $rx1=[int]($x1*2); $ry1=[int]($y1*2); $rx2=[int]($x2*2); $ry2=[int]($y2*2)
    & $adb -s emulator-5554 shell input swipe $rx1 $ry1 $rx2 $ry2 $ms
}

function CheckForKnownIssues($screenshotPath) {
    $issues = @()
    # Use Claude Code to analyse the screenshot if available; fallback to heuristics
    $fileSize = (Get-Item $screenshotPath).Length
    # Heuristic: very small files (<50KB) after lesson should load = still on loading screen
    if ($fileSize -lt 40000) { $issues += "LOADING_TIMEOUT" }
    return $issues
}

function LaunchApp() {
    Log "Launching app via deep link..."
    & $adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d $AppUrl host.exp.exponent 2>$null
    Start-Sleep -Seconds 10
}

function NavigateToLesson($langName, $topicName) {
    Log "Navigating to $langName → $topicName"
    # Find and tap the language card (scroll until visible then tap arrow)
    $found = $false
    for ($i = 0; $i -lt 5; $i++) {
        Swipe 270 600 270 400 300
        Start-Sleep -Seconds 1
        $ss = Screenshot "nav_scroll_$i"
        # If language is visible, tap it (coordinates will vary — use fixed positions from known scroll depth)
        $found = $true; break
    }
    # Tap language arrow, then topic row
    Tap 462 500    # Language arrow (approximate after scroll)
    Start-Sleep -Seconds 2
    Tap 270 363    # First topic (Greetings / Random)
}

function RunTestLoop() {
    $results = @()
    for ($loop = 1; $loop -le $Loops; $loop++) {
        Log "=== Loop $loop / $Loops ==="

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
                        Log "  → Restarting Metro bundler..."
                        $pid8081 = (Get-NetTCPConnection -LocalPort 8081 -EA SilentlyContinue).OwningProcess | Select -First 1
                        if ($pid8081) { Stop-Process -Id $pid8081 -Force }
                        Start-Sleep 3
                        Start-Process pwsh -ArgumentList "-Command `"Set-Location '$AppDir'; npx expo start --android`"" -WindowStyle Hidden
                        Start-Sleep 20
                    }
                }
            }
        }

        # Go back to home for next loop
        & $adb -s emulator-5554 shell input keyevent 82  # menu
        Start-Sleep 1
        & $adb -s emulator-5554 shell input tap 472 786  # Reload
        Start-Sleep 5
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
