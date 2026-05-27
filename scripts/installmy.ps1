<#
.SYNOPSIS
  Wireless-debug install helper for Android.

.DESCRIPTION
  Tries `adb connect 192.168.<Oct3>.<Oct4>:<Port>`. If it works, installs the
  APK. Otherwise prompts for the pairing port (different one shown on the
  phone's "Pair device with pairing code" screen), runs `adb pair`, then
  reconnects and installs.

.EXAMPLE
  .\scripts\installmy.ps1 50 60 33325
  # → adb connect 192.168.50.60:33325 then install release APK

.EXAMPLE
  .\scripts\installmy.ps1 50 60 33325 android\app\build\outputs\apk\debug\app-debug.apk
  # explicit APK path

.NOTES
  Default APK: android\app\build\outputs\apk\release\app-release.apk
  Build first: .\android\gradlew.bat -p android assembleRelease

  If you get "running scripts is disabled", run once (current user):
    Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
#>

param(
  [Parameter(Mandatory=$true, Position=0)][int]$Oct3,
  [Parameter(Mandatory=$true, Position=1)][int]$Oct4,
  [Parameter(Mandatory=$true, Position=2)][int]$Port,
  [Parameter(Position=3)][string]$Apk
)

$ErrorActionPreference = 'Stop'

$Ip = "192.168.$Oct3.$Oct4"
$Target = "${Ip}:${Port}"

$ScriptDir = $PSScriptRoot
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir '..')).Path
$DefaultApk = Join-Path $ProjectRoot 'android\app\build\outputs\apk\release\app-release.apk'

if ([string]::IsNullOrWhiteSpace($Apk)) {
  $Apk = $DefaultApk
} elseif (-not (Test-Path $Apk)) {
  $candidate = Join-Path $ProjectRoot $Apk
  if (Test-Path $candidate) { $Apk = $candidate }
}

# --- pre-flight ---

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: adb not found in PATH." -ForegroundColor Red
  Write-Host "Add Android SDK platform-tools to PATH, e.g.:"
  Write-Host '  $env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"'
  exit 1
}

if (-not (Test-Path $Apk)) {
  Write-Host "ERROR: APK not found at: $Apk" -ForegroundColor Red
  Write-Host ''
  Write-Host 'Build first:'
  Write-Host "  cd `"$ProjectRoot`""
  Write-Host '  .\android\gradlew.bat -p android assembleRelease'
  exit 1
}

Write-Host "Target : $Target"
Write-Host "APK    : $Apk"
Write-Host ''

# --- helpers ---

function Test-Connected {
  $devices = & adb devices
  $pattern = "^$([regex]::Escape($Target))\s+device$"
  foreach ($line in $devices) {
    if ($line -match $pattern) { return $true }
  }
  return $false
}

function Invoke-Connect {
  Write-Host "-> adb connect $Target"
  $out = & adb connect $Target
  foreach ($line in $out) { Write-Host "  $line" }
  Start-Sleep -Milliseconds 1000
  return (Test-Connected)
}

# --- step 1: direct connect ---

if (Invoke-Connect) {
  Write-Host '[ok] Connected directly.' -ForegroundColor Green
} else {
  Write-Host ''
  Write-Host 'Direct connect failed - pairing required.'
  Write-Host 'On the phone: Developer options -> Wireless debugging -> Pair device with pairing code'
  Write-Host 'It shows a 6-digit code AND a DIFFERENT port (pairing port).'
  Write-Host ''

  $PairPort = Read-Host 'Enter PAIRING port'
  $PairTarget = "${Ip}:${PairPort}"

  Write-Host "-> adb pair $PairTarget  (enter the 6-digit code when prompted)"
  & adb pair $PairTarget
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'ERROR: pairing failed.' -ForegroundColor Red
    exit 1
  }

  Write-Host '-> adb disconnect'
  & adb disconnect | Out-Null

  Write-Host ''
  if (Invoke-Connect) {
    Write-Host '[ok] Connected after pairing.' -ForegroundColor Green
  } else {
    Write-Host 'ERROR: still cannot connect after pairing.' -ForegroundColor Red
    Write-Host "Run 'adb devices' to inspect, then retry."
    exit 1
  }
}

# --- step 2: install ---

Write-Host ''
Write-Host "-> adb -s $Target install -r `"$Apk`""
& adb -s $Target install -r $Apk
if ($LASTEXITCODE -ne 0) {
  Write-Host 'ERROR: install failed.' -ForegroundColor Red
  exit 1
}
Write-Host '[ok] Installed.' -ForegroundColor Green
