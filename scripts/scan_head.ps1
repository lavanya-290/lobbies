Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path 'client/public/assets/characters/female_idle.png').Path)

# Let's inspect the head boundary
Write-Output "=== FEMALE HEAD SCAN (Y=4 to 280) ==="
for ($y = 4; $y -lt 280; $y += 10) {
    $minX = $bmp.Width; $maxX = 0; $has = $false
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        if ($bmp.GetPixel($x, $y).A -gt 20) {
            $has = $true
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
        }
    }
    if ($has) {
        Write-Output ("Y={0,3}: Width={1,3}, X=[{2,3}, {3,3}]" -f $y, ($maxX - $minX + 1), $minX, $maxX)
    }
}
$bmp.Dispose()
