$ErrorActionPreference = 'Stop'
$solvantaRoot = Split-Path -Parent $PSScriptRoot
$solvantaMobile = Join-Path $solvantaRoot 'mobile'
& (Join-Path $PSScriptRoot 'start-backend.ps1')

$listeners = @(Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue)
if ($listeners.Count -gt 0) {
    if (-not ($listeners | Where-Object { $_.LocalAddress -in @('0.0.0.0', '::') })) {
        throw 'Metro on port 8081 is localhost-only. Stop that Expo process, then rerun this phone launcher.'
    }
} else {
    $logDir = Join-Path $solvantaMobile '.expo'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Start-Process -FilePath (Get-Command node).Source -ArgumentList @('node_modules/expo/bin/cli', 'start', '--lan', '--port', '8081', '--max-workers', '2') -WorkingDirectory $solvantaMobile -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'phone-metro.log') -RedirectStandardError (Join-Path $logDir 'phone-metro-errors.log')
}
$addresses = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet|VPN|OpenVPN' })
foreach ($address in $addresses) {
    Write-Output "Expo Go on $($address.InterfaceAlias): exp://$($address.IPAddress):8081"
    Write-Output "API check: http://$($address.IPAddress):8000/api/v1/system/ready"
}
Write-Output 'If university Wi-Fi isolates clients, use a shared hotspot.'
