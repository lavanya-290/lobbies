Add-Type -AssemblyName System.Drawing

function Get-TightBBox($bmp) {
    $minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
    $has = $false
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.A -gt 25) {
                $has = $true
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if (-not $has) { return $null }
    return New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1)
}

$inputPath = "client\public\assets\outfits\casual\jeans_regular_walk_down.png"
$outputPath = "client\public\assets\outfits\casual\jeans_regular_walk_down.png"

$origSheet = [System.Drawing.Bitmap]::FromFile($inputPath)
$newSheet = New-Object System.Drawing.Bitmap 1284, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($newSheet)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

$targetW = 180
$targetH = 290
$topY = 470
$centerX = 160

for ($i = 0; $i -lt 4; $i++) {
    $frameRect = New-Object System.Drawing.Rectangle ($i * 321), 0, 321, 767
    $frameBmp = $origSheet.Clone($frameRect, $origSheet.PixelFormat)
    $bbox = Get-TightBBox $frameBmp
    if ($bbox) {
        $tight = $frameBmp.Clone($bbox, $frameBmp.PixelFormat)
        $scaleX = $targetW / $tight.Width
        $scaleY = $targetH / $tight.Height
        $scale = [Math]::Min($scaleX, $scaleY)
        
        $drawW = [int]($tight.Width * $scale)
        $drawH = [int]($tight.Height * $scale)
        $destX = ($i * 321) + $centerX - [int]($drawW / 2)
        $destY = $topY

        $g.DrawImage($tight, $destX, $destY, $drawW, $drawH)
        $tight.Dispose()
    }
    $frameBmp.Dispose()
}

$origSheet.Dispose()
$g.Dispose()

# Save temp first then replace
$tempPath = "client\public\assets\outfits\casual\jeans_regular_walk_down_realigned.png"
$newSheet.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newSheet.Dispose()

Move-Item -Path $tempPath -Destination $outputPath -Force
Write-Host "Successfully realigned jeans_regular_walk_down.png to TopY=$topY"
