$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:NODE_ENV = 'production'
if (-not $env:JAVA_HOME) {
    $laptaJdk = 'C:\Program Files\Android\Android Studio\jbr'
    if (Test-Path -LiteralPath $laptaJdk) { $env:JAVA_HOME = $laptaJdk }
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path -LiteralPath $env:ANDROID_HOME)) { throw 'Instala Android SDK y configura ANDROID_HOME.' }
& npx.cmd expo prebuild --platform android
if ($LASTEXITCODE -ne 0) { throw 'Falló la generación del proyecto Android.' }
Push-Location android
try { & .\gradlew.bat assembleRelease --no-daemon '-PreactNativeArchitectures=arm64-v8a,x86_64'; if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación Android. Revisa JDK y Android SDK.' } } finally { Pop-Location }
New-Item -ItemType Directory -Force dist | Out-Null
Copy-Item -LiteralPath android\app\build\outputs\apk\release\app-release.apk -Destination dist\LAPTA.apk
Write-Output 'APK disponible en dist/LAPTA.apk'
