Add-Type -AssemblyName System.Drawing

Write-Output "=== CHARACTER SHEETS ==="
$charFiles = @(
    'client/public/assets/characters/female_idle.png',
    'client/public/assets/characters/female_walk_down.png',
    'client/public/assets/characters/female_walk_up.png',
    'client/public/assets/characters/female_walk_right.png',
    'client/public/assets/characters/male_idle.png',
    'client/public/assets/characters/male_walk_down.png',
    'client/public/assets/characters/male_walk_up.png',
    'client/public/assets/characters/male_walk_right.png'
)

foreach ($f in $charFiles) {
    if (Test-Path $f) {
        $bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $f).Path)
        $isWalk = $f -like '*walk*'
        $frames = if ($isWalk) { 4 } else { 1 }
        $frameW = [int]($bmp.Width / $frames)
        $frameH = $bmp.Height
        Write-Output "$f : Total=$($bmp.Width)x$($bmp.Height), Frames=$frames, PerFrame=${frameW}x${frameH}"
        $bmp.Dispose()
    } else {
        Write-Output "MISSING: $f"
    }
}

Write-Output ""
Write-Output "=== OUTFIT PIECES ==="
$outfits = Get-ChildItem -Recurse -File client/public/assets/outfits
foreach ($o in $outfits) {
    $bmp = [System.Drawing.Bitmap]::FromFile($o.FullName)
    $rel = $o.FullName.Replace((Resolve-Path .).Path + "\", "")
    Write-Output "$rel : $($bmp.Width)x$($bmp.Height)"
    $bmp.Dispose()
}
