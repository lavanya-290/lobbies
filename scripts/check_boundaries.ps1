Add-Type -AssemblyName System.Drawing

$files = @(
    'client/public/assets/characters/base_female_walk_down.png',
    'client/public/assets/characters/base_female_walk_up.png',
    'client/public/assets/characters/base_female_walk_right.png',
    'client/public/assets/characters/base_male_walk_down.png',
    'client/public/assets/characters/base_male_walk_up.png',
    'client/public/assets/characters/base_male_walk_right.png'
)

foreach ($f in $files) {
    $bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $f).Path)
    Write-Output "Checking $f (Width: $($bmp.Width), Height: $($bmp.Height))..."
    # Check boundaries at X = 321, 642, 963
    for ($k = 1; $k -le 3; $k++) {
        $boundaryX = $k * 321
        $hasPixAtBoundary = $false
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            if ($bmp.GetPixel($boundaryX - 1, $y).A -gt 20 -and $bmp.GetPixel($boundaryX, $y).A -gt 20) {
                $hasPixAtBoundary = $true
                break
            }
        }
        if ($hasPixAtBoundary) {
            Write-Output "  WARNING: Frame boundary $boundaryX has overlapping pixels!"
        }
    }
    $bmp.Dispose()
}
Write-Output "Check finished."
