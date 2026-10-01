$files = Get-ChildItem -Recurse -File client/public/assets/outfits
$artDir = 'C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\79e822d2-ec08-4712-9739-215ac9de8943'
foreach ($f in $files) {
    $theme = $f.Directory.Name
    $dest = Join-Path $artDir "outfit_${theme}_$($f.Name)"
    Copy-Item $f.FullName $dest -Force
    Write-Output "Copied $dest"
}
