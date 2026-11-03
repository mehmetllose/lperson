# lperson release: surum artir -> debug APK derle -> GitHub Release olustur
# Kullanim:  powershell -ExecutionPolicy Bypass -File scripts\release.ps1 [-Notes "Degisiklikler"] [-NoPublish]
param([string]$Notes = "", [switch]$NoPublish)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$Repo = "mehmetllose/lperson"   # index.html icindeki APP_UPDATE_REPO ile ayni olmali

$gradle = Join-Path $root "android\app\build.gradle"
$txt = [IO.File]::ReadAllText($gradle)
$code = [int]([regex]::Match($txt, 'versionCode\s+(\d+)').Groups[1].Value)
$name = [regex]::Match($txt, 'versionName\s+"([^"]+)"').Groups[1].Value
$parts = $name.Split('.'); $parts[-1] = [string]([int]$parts[-1] + 1); $newName = $parts -join '.'
$newCode = $code + 1
$txt = [regex]::Replace($txt, 'versionCode\s+\d+', "versionCode $newCode")
$txt = [regex]::Replace($txt, 'versionName\s+"[^"]+"', "versionName `"$newName`"")
[IO.File]::WriteAllText($gradle, $txt, (New-Object Text.UTF8Encoding $false))
Write-Host "Surum: $name ($code) -> $newName ($newCode)"

npm run android:sync
if ($LASTEXITCODE -ne 0) { throw "android:sync basarisiz" }
Push-Location android
.\gradlew.bat assembleDebug
$ok = $LASTEXITCODE
Pop-Location
if ($ok -ne 0) { throw "Gradle derlemesi basarisiz" }

$apk = Join-Path $root "lperson-$newName.apk"
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" $apk -Force
node scripts\copy-debug-apk.mjs
Write-Host "APK: $apk"

if ($NoPublish) { Write-Host "Yayinlanmadi (-NoPublish)."; exit 0 }
if ($Repo -like "OWNER/*") { throw "scripts\release.ps1 icindeki `$Repo ayarlanmamis" }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh (GitHub CLI) kurulu degil: winget install GitHub.cli" }
if (-not $Notes) { $Notes = "lPerson v$newName" }
gh release create "v$newName" "$apk#lperson-$newName.apk" --repo $Repo --title "lPerson v$newName" --notes $Notes
if ($LASTEXITCODE -ne 0) { throw "gh release create basarisiz" }
Write-Host "Yayinlandi: v$newName"
