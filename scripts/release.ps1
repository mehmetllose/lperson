# lperson release: surum artir -> debug APK derle -> GitHub Release olustur
# Kullanim:
#   release.ps1 -Notes "Tek satir not"
#   release.ps1 -Notes "Madde 1","Madde 2","Madde 3"      (her biri "- " madde olur)
#   release.ps1 -NotesFile scripts\release-notes.md        (cok satirli Markdown, UTF-8)
#   release.ps1 ... -NoPublish                             (yalnizca derle)
# Notlar uygulamadaki "Yenilikler" penceresinde gosterilir. Kisa, kullanicinin anlayacagi
# Turkce maddeler yazin; ornek icin scripts\RELEASE_NOTES_ORNEK.md dosyasina bakin.
param([string[]]$Notes = @(), [string]$NotesFile = "", [switch]$NoPublish)
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
# index.html icindeki yedek surum etiketini guncelle (web / eski APK icin)
$idx = Join-Path $root "public\index.html"
$h = [IO.File]::ReadAllText($idx)
$h = [regex]::Replace($h, 'const APP_VERSION_FALLBACK = "[^"]+"', "const APP_VERSION_FALLBACK = `"$newName`"")
[IO.File]::WriteAllText($idx, $h, (New-Object Text.UTF8Encoding($false)))

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
if ($NotesFile) {
  $body = [IO.File]::ReadAllText((Resolve-Path $NotesFile), [Text.Encoding]::UTF8)
} elseif ($Notes.Count -gt 1) {
  $body = ($Notes | Where-Object { $_.Trim() } | ForEach-Object { "- " + ($_.Trim() -replace '^[-*\u2022]\s*', '') }) -join "`n"
} elseif ($Notes.Count -eq 1 -and $Notes[0].Trim()) {
  $body = $Notes[0] -replace '\\n', "`n"
} else { $body = "- lPerson v$newName" }
$notesTmp = Join-Path $env:TEMP "lperson-notes-$newName.md"
[IO.File]::WriteAllText($notesTmp, $body, (New-Object Text.UTF8Encoding $false))
gh release create "v$newName" "$apk#lperson-$newName.apk" --repo $Repo --title "lPerson v$newName" --notes-file $notesTmp
if ($LASTEXITCODE -ne 0) { throw "gh release create basarisiz" }
Write-Host "Yayinlandi: v$newName"
