Add-Type -AssemblyName System.Drawing

$testPairs = @(
    @{ Category = 'top'; Outfit = 'client/public/assets/outfits/casual/henley_shirt_idle.png'; Base = 'client/public/assets/characters/male_idle.png' },
    @{ Category = 'bottom'; Outfit = 'client/public/assets/outfits/casual/jeans_regular_idle.png'; Base = 'client/public/assets/characters/male_idle.png' },
    @{ Category = 'hat'; Outfit = 'client/public/assets/outfits/japanese/conical_hat_idle.png'; Base = 'client/public/assets/characters/female_idle.png' },
    @{ Category = 'shoes'; Outfit = 'client/public/assets/outfits/japanese/geta_sandals_idle.png'; Base = 'client/public/assets/characters/female_idle.png' },
    @{ Category = 'dress'; Outfit = 'client/public/assets/outfits/japanese/kimono_casual_idle.png'; Base = 'client/public/assets/characters/female_idle.png' }
)

function Get-BBox($b) {
    $minX=$b.Width; $maxX=0; $minY=$b.Height; $maxY=0
    for ($y=0;$y -lt $b.Height;$y++) {
        for ($x=0;$x -lt $b.Width;$x++) {
            if ($b.GetPixel($x,$y).A -gt 20) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    return [PSCustomObject]@{
        W = ($maxX - $minX + 1)
        H = ($maxY - $minY + 1)
        MinX = $minX; MaxX = $maxX
        MinY = $minY; MaxY = $maxY
        Cx = [int](($minX + $maxX) / 2)
        Cy = [int](($minY + $maxY) / 2)
    }
}

foreach ($p in $testPairs) {
    $cat = $p['Category']
    $oBmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $p['Outfit']).Path)
    $bBmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $p['Base']).Path)
    $oBox = Get-BBox $oBmp
    $bBox = Get-BBox $bBmp
    Write-Output "[$cat]"
    Write-Output "  Outfit Box: $($oBox.W)x$($oBox.H), X=[$($oBox.MinX), $($oBox.MaxX)], Y=[$($oBox.MinY), $($oBox.MaxY)], Center=($($oBox.Cx), $($oBox.Cy))"
    Write-Output "  Base Box:   $($bBox.W)x$($bBox.H), X=[$($bBox.MinX), $($bBox.MaxX)], Y=[$($bBox.MinY), $($bBox.MaxY)], Center=($($bBox.Cx), $($bBox.Cy))"
    $oBmp.Dispose(); $bBmp.Dispose()
}
