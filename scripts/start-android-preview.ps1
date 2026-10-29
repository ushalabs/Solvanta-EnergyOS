$ErrorActionPreference = 'Stop'
$solvantaRoot = Split-Path -Parent $PSScriptRoot
$solvantaMobile = Join-Path $solvantaRoot 'mobile'
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
# Keep localhost IPv4 so adb reverse and the Metro listener use the same address.
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
$solvantaAdb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
New-Item -ItemType Directory -Path (Join-Path $solvantaMobile '.expo') -Force | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $solvantaMobile 'node_modules\expo'))) {
    throw 'Run npm ci in mobile first.'
}
if (-not (Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath (Get-Command node).Source -ArgumentList @('node_modules/expo/bin/cli', 'start', '--localhost', '--port', '8081', '--max-workers', '2') -WorkingDirectory $solvantaMobile -WindowStyle Hidden -RedirectStandardOutput (Join-Path $solvantaMobile '.expo\metro-stdout.log') -RedirectStandardError (Join-Path $solvantaMobile '.expo\metro-stderr.log')
}
if (-not (Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath (Get-Command python).Source -ArgumentList @('scripts/android-preview.py') -WorkingDirectory $solvantaRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $solvantaMobile '.expo\adb-viewer.log') -RedirectStandardError (Join-Path $solvantaMobile '.expo\adb-viewer-errors.log')
}
& $solvantaAdb -s emulator-5554 reverse tcp:8081 tcp:8081
& $solvantaAdb -s emulator-5554 reverse tcp:8000 tcp:8000
& $solvantaAdb -s emulator-5554 shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8081 host.exp.exponent
Write-Output 'Live Android viewer: http://localhost:8765'
