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

function Realign-Sheet($filePath, $category, $direction) {
    if (-not (Test-Path $filePath)) {
        Write-Host "File not found: $filePath"
        return
    }

    $topY = 292
    $bottomY = -1
    $targetW = 250
    $targetH = 320
    $centerX = 160

    switch ($category.ToLower()) {
        "top" {
            $targetW = if ($direction -eq "walk_right") { 220 } else { 240 }
            $targetH = 220
            $topY = 292
        }
        "bottom" {
            $targetW = if ($direction -eq "walk_right") { 180 } else { 200 }
            $targetH = 290
            $topY = 470
        }
        "headwear" {
            $targetW = if ($direction -eq "walk_right") { 260 } else { 280 }
            $targetH = 180
            $topY = 4
        }
        "face_accessory" {
            $targetW = if ($direction -eq "walk_right") { 160 } else { 170 }
            $targetH = 130
            $topY = 170
        }
    }

    $origSheet = [System.Drawing.Bitmap]::FromFile($filePath)
    $newSheet = New-Object System.Drawing.Bitmap 1284, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($newSheet)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

    for ($i = 0; $i -lt 4; $i++) {
        $frameRect = New-Object System.Drawing.Rectangle ($i * 321), 0, 321, 767
        $frameBmp = $origSheet.Clone($frameRect, $origSheet.PixelFormat)
        $bbox = Get-TightBBox $frameBmp
        if ($bbox) {
            $tight = $frameBmp.Clone($bbox, $frameBmp.PixelFormat)
            $scaleX = $targetW / $tight.Width
            $scaleY = if ($targetH -gt 0) { $targetH / $tight.Height } else { $scaleX }
            $scale = [Math]::Min($scaleX, $scaleY)
            
            $drawW = [int]($tight.Width * $scale)
            $drawH = [int]($tight.Height * $scale)
            $destX = ($i * 321) + $centerX - [int]($drawW / 2)
            $destY = if ($bottomY -gt 0) { $bottomY - $drawH } else { $topY }

            $g.DrawImage($tight, $destX, $destY, $drawW, $drawH)
            $tight.Dispose()
        }
        $frameBmp.Dispose()
    }

    $origSheet.Dispose()
    $g.Dispose()

    $tempPath = $filePath + ".tmp.png"
    $newSheet.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $newSheet.Dispose()

    Move-Item -Path $tempPath -Destination $filePath -Force
    Write-Host "Realigned $filePath -> TopY=$topY, TargetW=$targetW, TargetH=$targetH"
}

# Test Realigning Crop Top and Culottes
$outfitDir = "client\public\assets\outfits"
Realign-Sheet "$outfitDir\casual\crop_top_walk_down.png" "top" "walk_down"
Realign-Sheet "$outfitDir\casual\culottes_walk_down.png" "bottom" "walk_down"
Realign-Sheet "$outfitDir\japanese\conical_hat_walk_down.png" "headwear" "walk_down"

# Composite test
$charDir = "client\public\assets\characters"
$scratchDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch"

$comp = New-Object System.Drawing.Bitmap 1284, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($comp)

$bg = [System.Drawing.Bitmap]::FromFile("$charDir\base_female_walk_down.png")
$cul = [System.Drawing.Bitmap]::FromFile("$outfitDir\casual\culottes_walk_down.png")
$crop = [System.Drawing.Bitmap]::FromFile("$outfitDir\casual\crop_top_walk_down.png")
$hat = [System.Drawing.Bitmap]::FromFile("$outfitDir\japanese\conical_hat_walk_down.png")

$g.DrawImage($bg, 0, 0, 1284, 767)
$g.DrawImage($cul, 0, 0, 1284, 767)
$g.DrawImage($crop, 0, 0, 1284, 767)
$g.DrawImage($hat, 0, 0, 1284, 767)

$testOut = "$scratchDir\verified_realigned_female_casual_walk_down.png"
$comp.Save($testOut, [System.Drawing.Imaging.ImageFormat]::Png)

$bg.Dispose(); $cul.Dispose(); $crop.Dispose(); $hat.Dispose(); $comp.Dispose(); $g.Dispose()
Write-Host "Verification composite saved to: $testOut"
