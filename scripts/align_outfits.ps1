Add-Type -AssemblyName System.Drawing

function Get-TightBBox($bmp) {
    $minX = $bmp.Width; $maxX = 0; $minY = $bmp.Height; $maxY = 0; $has = $false
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            if ($bmp.GetPixel($x, $y).A -gt 20) {
                $has = $true
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($has) {
        return [PSCustomObject]@{
            X = $minX; Y = $minY; W = ($maxX - $minX + 1); H = ($maxY - $minY + 1)
        }
    }
    return $null
}

# Crop tight artwork
function Crop-Tight($bmp, $box) {
    $cropped = New-Object System.Drawing.Bitmap $box.W, $box.H, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($cropped)
    $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, $box.W, $box.H), (New-Object System.Drawing.Rectangle $box.X, $box.Y, $box.W, $box.H), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    return $cropped
}

$scratchDir = 'C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\79e822d2-ec08-4712-9739-215ac9de8943\scratch\aligned_composites'
if (!(Test-Path $scratchDir)) { New-Item -ItemType Directory -Path $scratchDir -Force | Out-Null }

# Target dimensions on 321x767 canvas:
# Head top: Y=4, Neck: Y=324, Waist: Y=524, Feet bottom: Y=762. CenterX: 160.
$categorySpecs = @{
    'top' = @{ TargetW = 246; TargetH = 200; CenterX = 160; TopY = 324 }
    'coat' = @{ TargetW = 260; TargetH = 400; CenterX = 160; TopY = 320 }
    'bottom' = @{ TargetW = 180; TargetH = 240; CenterX = 160; TopY = 515 }
    'culottes' = @{ TargetW = 200; TargetH = 170; CenterX = 160; TopY = 515 }
    'hat' = @{ TargetW = 290; TargetH = 180; CenterX = 160; TopY = 0 }
    'eyepatch' = @{ TargetW = 170; TargetH = 130; CenterX = 160; TopY = 170 }
    'shoes' = @{ TargetW = 175; TargetH = 100; CenterX = 160; BottomY = 762 }
    'dress' = @{ TargetW = 250; TargetH = 440; CenterX = 160; TopY = 320 }
}

$testItems = @(
    @{ Category = 'top'; SpecKey = 'top'; Outfit = 'client/public/assets/outfits/casual/henley_shirt_idle.png'; Base = 'client/public/assets/characters/male_idle.png' },
    @{ Category = 'bottom'; SpecKey = 'bottom'; Outfit = 'client/public/assets/outfits/casual/jeans_regular_idle.png'; Base = 'client/public/assets/characters/male_idle.png' },
    @{ Category = 'hat'; SpecKey = 'hat'; Outfit = 'client/public/assets/outfits/japanese/conical_hat_idle.png'; Base = 'client/public/assets/characters/female_idle.png' },
    @{ Category = 'shoes'; SpecKey = 'shoes'; Outfit = 'client/public/assets/outfits/japanese/geta_sandals_idle.png'; Base = 'client/public/assets/characters/female_idle.png' },
    @{ Category = 'dress'; SpecKey = 'dress'; Outfit = 'client/public/assets/outfits/japanese/kimono_casual_idle.png'; Base = 'client/public/assets/characters/female_idle.png' }
)

foreach ($item in $testItems) {
    $outfitBmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $item.Outfit).Path)
    $baseBmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $item.Base).Path)
    $spec = $categorySpecs[$item.SpecKey]
    
    $box = Get-TightBBox $outfitBmp
    $tight = Crop-Tight $outfitBmp $box
    
    # Calculate scale factor preserving aspect ratio
    $scaleX = $spec.TargetW / $tight.Width
    $scaleY = if ($spec.ContainsKey('TargetH')) { $spec.TargetH / $tight.Height } else { $scaleX }
    $scale = [Math]::Min($scaleX, $scaleY)
    
    $drawW = [int]($tight.Width * $scale)
    $drawH = [int]($tight.Height * $scale)
    
    $destX = $spec.CenterX - [int]($drawW / 2)
    $destY = if ($spec.ContainsKey('BottomY')) { $spec.BottomY - $drawH } else { $spec.TopY }
    
    # Create composite on 321x767 canvas
    $canvas = New-Object System.Drawing.Bitmap 321, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    
    # Draw base character
    $g.DrawImage($baseBmp, 0, 0, 321, 767)
    
    # Draw aligned outfit piece
    $g.DrawImage($tight, (New-Object System.Drawing.Rectangle $destX, $destY, $drawW, $drawH), 0, 0, $tight.Width, $tight.Height, [System.Drawing.GraphicsUnit]::Pixel)
    
    $g.Dispose()
    $outPath = Join-Path $scratchDir "aligned_$($item.Category).png"
    $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    $tight.Dispose()
    $outfitBmp.Dispose()
    $baseBmp.Dispose()
    
    Write-Output "Aligned $($item.Category): Pos=($destX, $destY), Size=($drawW x $drawH) -> $outPath"
}
