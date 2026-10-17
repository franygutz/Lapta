$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$laptaArchive = Join-Path (Get-Location) '.android-tools\android-ndk-r27b-windows.zip'
$laptaChecksum = (Get-FileHash -LiteralPath $laptaArchive -Algorithm SHA1).Hash.ToLowerInvariant()
# Google repository2-3.xml, ndk;27.1.12297006, Windows.
if ($laptaChecksum -ne '3bb7efc850cd0af7707854b7e0d5c3b6a7153703') { throw 'El archivo NDK no coincide con el checksum oficial.' }
$laptaSdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$laptaDestination = Join-Path $laptaSdk 'ndk\27.1.12297006'
if (Test-Path -LiteralPath (Join-Path $laptaDestination 'source.properties')) { Write-Output 'NDK ya instalado.'; exit 0 }
# Extraer directamente y de forma reversible, sin borrar ni mover carpetas del SDK.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$laptaZip = [System.IO.Compression.ZipFile]::OpenRead($laptaArchive)
try {
    foreach ($laptaEntry in $laptaZip.Entries) {
        $laptaRelative = $laptaEntry.FullName -replace '^android-ndk-r27b/', ''
        if (-not $laptaRelative) { continue }
        $laptaOutput = [System.IO.Path]::GetFullPath((Join-Path $laptaDestination $laptaRelative))
        $laptaBoundary = [System.IO.Path]::GetFullPath($laptaDestination) + [System.IO.Path]::DirectorySeparatorChar
        if (-not $laptaOutput.StartsWith($laptaBoundary, [StringComparison]::OrdinalIgnoreCase)) { throw 'Ruta ZIP fuera del directorio NDK.' }
        if ($laptaEntry.FullName.EndsWith('/')) { [System.IO.Directory]::CreateDirectory($laptaOutput) | Out-Null; continue }
        [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($laptaOutput)) | Out-Null
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($laptaEntry, $laptaOutput, $true)
    }
} finally { $laptaZip.Dispose() }
Write-Output 'NDK oficial verificado e instalado.'
