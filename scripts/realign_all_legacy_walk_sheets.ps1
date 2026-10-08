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

$outfitDir = "client\public\assets\outfits"
$dirs = @("walk_down", "walk_up", "walk_right")

# 1. Crop Top (top)
foreach ($d in $dirs) {
    Realign-Sheet "$outfitDir\casual\crop_top_$d.png" "top" $d
}

# 2. Culottes (bottom)
foreach ($d in $dirs) {
    Realign-Sheet "$outfitDir\casual\culottes_$d.png" "bottom" $d
}

# 3. Henley Shirt (top)
foreach ($d in $dirs) {
    Realign-Sheet "$outfitDir\casual\henley_shirt_$d.png" "top" $d
}

# 4. Conical Hat (headwear)
foreach ($d in $dirs) {
    Realign-Sheet "$outfitDir\japanese\conical_hat_$d.png" "headwear" $d
}

# 5. Tricorn Hat (headwear)
foreach ($d in $dirs) {
    Realign-Sheet "$outfitDir\pirate\tricorn_hat_$d.png" "headwear" $d
}

# 6. Eyepatch (face_accessory)
foreach ($d in $dirs) {
    Realign-Sheet "$outfitDir\pirate\eyepatch_accessory_$d.png" "face_accessory" $d
}

Write-Host "All legacy walk sheets realigned!"
