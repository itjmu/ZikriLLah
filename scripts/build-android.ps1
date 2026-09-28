$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$jdk = Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tools') -Directory -Filter 'jdk-17*' | Select-Object -First 1
if (-not $jdk) { throw 'Java 17 missing in .tools. See README.md.' }
$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
Push-Location (Join-Path $projectRoot 'android')
try {
    & .\gradlew.bat --no-daemon assembleDebug testDebugUnitTest lintDebug
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    $outputDir = Join-Path $projectRoot 'dist'
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Copy-Item -LiteralPath '.\app\build\outputs\apk\debug\app-debug.apk' -Destination (Join-Path $outputDir 'ZikriLLah-debug.apk')
    Write-Host "APK: $outputDir\ZikriLLah-debug.apk"
} finally { Pop-Location }
