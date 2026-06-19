#!/usr/bin/env pwsh
# deploy.ps1 — SilkRoadDuo deploy script
# Usage: pwsh deploy.ps1 [patch|minor|major|skip-release]

param(
    [string]$Release = "patch"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Fail($msg) { Write-Error "ABORT: $msg"; exit 1 }

# ─── PRE-DEPLOY SAFETY CHECKS ────────────────────────────────────────────────

Write-Host "`n[1/3] Checking .env is not staged or tracked..." -ForegroundColor Cyan

$ignored = git check-ignore -v .env 2>&1
if ($ignored -match "^!" -or [string]::IsNullOrEmpty($ignored)) {
    Fail ".env is tracked by git. Run: git rm --cached .env"
}
$staged = git diff --cached --name-only | Where-Object { $_ -eq ".env" }
if ($staged) {
    Fail ".env is staged. Unstage it: git restore --staged .env"
}
Write-Host "  .env is gitignored — OK" -ForegroundColor Green

Write-Host "`n[2/3] Scanning for hardcoded secrets..." -ForegroundColor Cyan
$secretPatterns = @("sk-[A-Za-z0-9]", "gsk_[A-Za-z0-9]", "key\s*=\s*['\`"][A-Za-z0-9]")
$sourceFiles = @("App.js", "app.json", "eas.json", "babel.config.js")
$hitFound = $false
foreach ($file in $sourceFiles) {
    if (-not (Test-Path $file)) { continue }
    foreach ($pattern in $secretPatterns) {
        $hits = Select-String -Path $file -Pattern $pattern -ErrorAction SilentlyContinue
        if ($hits) {
            Write-Warning "  Secret pattern '$pattern' found in $file"
            $hits | ForEach-Object { Write-Warning "    Line $($_.LineNumber): $($_.Line.Trim())" }
            $hitFound = $true
        }
    }
}
if ($hitFound) {
    Fail "Hardcoded secrets detected. Move them to .env and read via process.env."
}
Write-Host "  No hardcoded secrets found — OK" -ForegroundColor Green

Write-Host "`n[3/3] Smoke-testing App.js syntax..." -ForegroundColor Cyan
node --check App.js
if ($LASTEXITCODE -ne 0) { Fail "App.js failed syntax check." }
Write-Host "  App.js syntax OK" -ForegroundColor Green

# ─── STAGE & COMMIT ──────────────────────────────────────────────────────────

Write-Host "`n[Deploy] Staging files..." -ForegroundColor Cyan
$filesToAdd = @("App.js", "app.json", "eas.json", "babel.config.js",
                "package.json", "package-lock.json", ".gitignore", ".env.example")
foreach ($f in $filesToAdd) {
    if (Test-Path $f) { git add $f }
}
if (Test-Path "CLAUDE.md") { git add CLAUDE.md }
if (Test-Path "README.md")  { git add README.md  }

Write-Host "`n[Deploy] Staged files (verify no .env / node_modules / .log):" -ForegroundColor Cyan
git status

$msg = Read-Host "`nCommit message (leave blank to skip commit if nothing changed)"
if (-not [string]::IsNullOrWhiteSpace($msg)) {
    git commit -m $msg
    if ($LASTEXITCODE -ne 0) { Fail "git commit failed." }
} else {
    Write-Host "  No commit message — skipping commit." -ForegroundColor Yellow
}

# ─── PUSH ────────────────────────────────────────────────────────────────────

Write-Host "`n[Deploy] Pushing to origin master..." -ForegroundColor Cyan
git push origin master
if ($LASTEXITCODE -ne 0) { Fail "git push failed." }
Write-Host "  Push succeeded." -ForegroundColor Green

# ─── CLEAN-CHECKOUT VERIFY ───────────────────────────────────────────────────

Write-Host "`n[Verify] Cloning to temp dir for clean-checkout test..." -ForegroundColor Cyan
$tmpDir = "$env:TEMP\silkroadduo-verify-$(Get-Random)"
git clone https://github.com/azaurov/SilkRoadDuo.git $tmpDir
if ($LASTEXITCODE -ne 0) { Fail "Clone failed." }

Push-Location $tmpDir
try {
    Copy-Item "$PSScriptRoot\.env" ".env" -ErrorAction SilentlyContinue
    npm install --prefer-offline
    node --check App.js
    if ($LASTEXITCODE -ne 0) { Fail "App.js syntax check failed in clean checkout." }
    Write-Host "  Clean-checkout smoke test passed." -ForegroundColor Green
} finally {
    Pop-Location
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
}

# ─── RELEASE ─────────────────────────────────────────────────────────────────

if ($Release -eq "skip-release") {
    Write-Host "`n[Release] Skipped (docs/chore-only change)." -ForegroundColor Yellow
    exit 0
}

$validBumps = @("patch","minor","major")
if ($Release -notin $validBumps) {
    Write-Warning "Unknown release type '$Release'. Skipping release. Use patch/minor/major/skip-release."
    exit 0
}

Write-Host "`n[Release] Bumping version ($Release)..." -ForegroundColor Cyan
npm version $Release --no-git-tag-version
$newVersion = (Get-Content package.json | ConvertFrom-Json).version
$tag = "v$newVersion"

git add package.json package-lock.json
git commit -m "chore: release $tag"
git tag $tag
git push origin master --follow-tags

Write-Host "`n[Release] Creating GitHub release $tag..." -ForegroundColor Cyan
$releaseNotes = @"
## Changes since previous release

<!-- Fill in feat: / fix: / chore: / docs: entries here before running -->

**Breaking:** none

**Upgrade notes:** none
"@
$releaseNotes | Out-File -FilePath "$env:TEMP\release-notes.md" -Encoding UTF8

gh release create $tag `
    --title "$tag — " `
    --notes-file "$env:TEMP\release-notes.md" `
    --target master

Remove-Item "$env:TEMP\release-notes.md" -ErrorAction SilentlyContinue

gh release view $tag --json name,tagName,publishedAt,url,isPrerelease

Write-Host "`nDeploy complete." -ForegroundColor Green
