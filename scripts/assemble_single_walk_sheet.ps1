param (
    [Parameter(Mandatory=$true)][string]$stripFile,
    [Parameter(Mandatory=$true)][string]$outputSheet,
    [Parameter(Mandatory=$true)][string]$category, # dress, top, bottom, footwear, headwear
    [Parameter(Mandatory=$true)][string]$direction, # walk_down, walk_up, walk_right
    [double]$topCropRatio = 0.0
)

Add-Type -AssemblyName System.Drawing

function Get-TightBBox($bmp, $startY = 0) {
    $minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
    $found = $false
    for ($y = $startY; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.A -gt 25) {
                $found = $true
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if (-not $found) { return $null }
    return New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1)
}

if (-not (Test-Path $stripFile)) {
    Write-Error "Strip file not found: $stripFile"
    exit 1
}

$rawStrip = [System.Drawing.Bitmap]::FromFile($stripFile)
$stripW = $rawStrip.Width
$stripH = $rawStrip.Height

# Setup parameters based on category
$targetW = 240
$targetH = 430
$topY = 292
$bottomY = -1
$centerX = 160

switch ($category.ToLower()) {
    "dress" {
        $targetW = if ($direction -eq "walk_right") { 230 } else { 250 }
        $targetH = 430
        $topY = 292
    }
    "top" {
        $targetW = if ($direction -eq "walk_right") { 220 } else { 250 }
        $targetH = 320
        $topY = 292
    }
    "bottom" {
        $targetW = if ($direction -eq "walk_right") { 180 } else { 200 }
        $targetH = 290
        $topY = 470
    }
    "footwear" {
        $targetW = if ($direction -eq "walk_right") { 310 } else { 260 }
        $targetH = 115
        $bottomY = 762
    }
    "waist_footwear" {
        $targetW = if ($direction -eq "walk_right") { 180 } else { 190 }
        $targetH = 290
        $bottomY = 762
    }
}

# Create 1284x767 final canvas (4 frames of 321x767)
$finalSheet = New-Object System.Drawing.Bitmap 1284, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gFinal = [System.Drawing.Graphics]::FromImage($finalSheet)
$gFinal.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

$colW = [int]($stripW / 4)
$colH = $stripH

for ($i = 0; $i -lt 4; $i++) {
    $frameRect = New-Object System.Drawing.Rectangle ($i * $colW), 0, $colW, $colH
    $frameBmp = $rawStrip.Clone($frameRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    # Remove white / near-white background
    for ($y = 0; $y -lt $frameBmp.Height; $y++) {
        for ($x = 0; $x -lt $frameBmp.Width; $x++) {
            $p = $frameBmp.GetPixel($x, $y)
            if ($p.R -gt 225 -and $p.G -gt 225 -and $p.B -gt 225) {
                $frameBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
        }
    }

    $startY = [int]($colH * $topCropRatio)
    $bbox = Get-TightBBox $frameBmp $startY
    if ($bbox -and $bbox.Width -gt 5 -and $bbox.Height -gt 5) {
        $cropped = $frameBmp.Clone($bbox, $frameBmp.PixelFormat)
        
        $scaleX = $targetW / $cropped.Width
        $scaleY = if ($targetH -gt 0) { $targetH / $cropped.Height } else { $scaleX }
        $scale = [Math]::Min($scaleX, $scaleY)

        $drawW = [int]($cropped.Width * $scale)
        $drawH = [int]($cropped.Height * $scale)
        $destX = ($i * 321) + $centerX - [int]($drawW / 2)
        $destY = if ($bottomY -gt 0) { $bottomY - $drawH } else { $topY }

        $gFinal.DrawImage($cropped, $destX, $destY, $drawW, $drawH)
        $cropped.Dispose()
    }
    $frameBmp.Dispose()
}

$rawStrip.Dispose()
$gFinal.Dispose()

# Ensure parent directory exists
$parentDir = Split-Path -Parent $outputSheet
if (-not (Test-Path $parentDir)) { New-Item -ItemType Directory -Path $parentDir -Force | Out-Null }

$finalSheet.Save($outputSheet, [System.Drawing.Imaging.ImageFormat]::Png)
$finalSheet.Dispose()
Write-Host "Successfully assembled: $outputSheet (1284x767)"
