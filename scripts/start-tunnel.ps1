$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$tunnelBinary = Join-Path $projectRoot '.tools/cloudflared.exe'
$expectedHash = 'f096265ec2fcbe9bb6e2d64268db167ced3fcbb83d894bdb9e2fcdb26f2ea7e2'
if (!(Test-Path -LiteralPath $tunnelBinary)) {
    New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot '.tools') | Out-Null
    Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/cloudflare/cloudflared/releases/download/2026.9.3/cloudflared-windows-amd64.exe' -OutFile $tunnelBinary
}
if ((Get-FileHash -LiteralPath $tunnelBinary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'cloudflared SHA256 mismatch.' }
try { $page=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/' -TimeoutSec 5 } catch { throw 'Start ZikriLLah first: npm.cmd start' }
if ($page.Content -notlike '*ZikriLLah*') { throw 'Port 3000 is not ZikriLLah. Tunnel was not started.' }
Write-Host 'Starting temporary HTTPS access. Keep this terminal and npm start running. Ctrl+C stops the tunnel.'
$urlSaved = $false
# Native diagnostic lines use stderr; they are not PowerShell failures.
$ErrorActionPreference = 'Continue'
& $tunnelBinary tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:3000 2>&1 | ForEach-Object {
    $line = [string]$_
    Write-Host $line
    if (!$urlSaved -and $line -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
        $publicUrl = $Matches[0]
        & node (Join-Path $PSScriptRoot 'set-public-url.mjs') $publicUrl
        if ($LASTEXITCODE -eq 0) { $urlSaved = $true; Write-Host 'Restart ONLY your ZikriLLah bot to update its Web App button.' }
    }
}
exit $LASTEXITCODE
