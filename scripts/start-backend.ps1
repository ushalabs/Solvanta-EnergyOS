$ErrorActionPreference = 'Stop'
$solvantaRoot = Split-Path -Parent $PSScriptRoot
$solvantaBackend = Join-Path $solvantaRoot 'backend'
$solvantaPython = Join-Path $solvantaBackend '.venv\Scripts\python.exe'
if (-not (Test-Path $solvantaPython)) { throw 'Create backend/.venv and install backend/requirements.txt first.' }
$listener = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    if ($listener.LocalAddress -notcontains '0.0.0.0' -and $listener.LocalAddress -notcontains '::') {
        throw 'Port 8000 is loopback-only. Stop the existing backend and run this launcher again for phone access.'
    }
} else {
    $logDir = Join-Path $solvantaRoot 'mobile/.expo'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Start-Process -FilePath $solvantaPython -ArgumentList 'run.py' -WorkingDirectory $solvantaBackend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'backend.log') -RedirectStandardError (Join-Path $logDir 'backend-errors.log')
}
Write-Output 'Backend uses 0.0.0.0:8000. Test /api/v1/system/ready from the phone using your Wi-Fi IPv4 address.'
Get-NetIPAddress -AddressFamily IPv4 | Where-Object InterfaceAlias -eq 'Wi-Fi' | Select-Object IPAddress
