Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\79e822d2-ec08-4712-9739-215ac9de8943"
$outfitsBaseDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\outfits"
$charFramesDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters\frames"

function Get-TightBBox($bmp) {
    $minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.A -gt 15) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($minX -gt $maxX) { return New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height }
    return New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1)
}

function Slice-StripToWalkSheet {
    param (
        [string]$stripFile,
        [string]$outputSheet,
        [int]$targetW,
        [int]$targetH,
        [int]$topY,
        [int]$bottomY = -1,
        [int]$centerX = 160,
        [int]$sliceRow = 0, # if multiple rows, e.g. 0 = top half
        [int]$totalRows = 1
    )

    $rawStrip = [System.Drawing.Bitmap]::FromFile($stripFile)
    $stripW = $rawStrip.Width
    $stripH = $rawStrip.Height

    # Create 321x767 x 4 = 1284x767 canvas
    $finalSheet = New-Object System.Drawing.Bitmap 1284, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gFinal = [System.Drawing.Graphics]::FromImage($finalSheet)
    $gFinal.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

    $colW = [int]($stripW / 4)
    $rowH = [int]($stripH / $totalRows)
    $rowY = $sliceRow * $rowH

    for ($i = 0; $i -lt 4; $i++) {
        $frameRect = New-Object System.Drawing.Rectangle ($i * $colW), $rowY, $colW, $rowH
        $frameBmp = $rawStrip.Clone($frameRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

        # Remove white / light background pixels
        for ($y = 0; $y -lt $frameBmp.Height; $y++) {
            for ($x = 0; $x -lt $frameBmp.Width; $x++) {
                $p = $frameBmp.GetPixel($x, $y)
                # Background removal: light or near white
                if ($p.R -gt 225 -and $p.G -gt 225 -and $p.B -gt 225) {
                    $frameBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                }
            }
        }

        # Crop tight
        $bbox = Get-TightBBox $frameBmp
        if ($bbox.Width -gt 5 -and $bbox.Height -gt 5) {
            $cropped = $frameBmp.Clone($bbox, $frameBmp.PixelFormat)
            
            # Scale
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

    $finalSheet.Save($outputSheet, [System.Drawing.Imaging.ImageFormat]::Png)
    $finalSheet.Dispose()
    Write-Host "Successfully generated: $outputSheet (1284x767)"
}

Write-Host "=== Assembling Crop Top Walk Sheets ==="
$cropWd = (Get-ChildItem -Path $brainDir -Filter "crop_top_wd_strip*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$cropWu = (Get-ChildItem -Path $brainDir -Filter "crop_top_wu_strip*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$cropWr = (Get-ChildItem -Path $brainDir -Filter "crop_top_wr_strip*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

if ($cropWd) {
    Slice-StripToWalkSheet -stripFile $cropWd -outputSheet "$outfitsBaseDir\casual\crop_top_walk_down.png" -targetW 180 -targetH 115 -topY 445
}
if ($cropWu) {
    Slice-StripToWalkSheet -stripFile $cropWu -outputSheet "$outfitsBaseDir\casual\crop_top_walk_up.png" -targetW 180 -targetH 115 -topY 445 -totalRows 2 -sliceRow 0
}
if ($cropWr) {
    Slice-StripToWalkSheet -stripFile $cropWr -outputSheet "$outfitsBaseDir\casual\crop_top_walk_right.png" -targetW 160 -targetH 115 -topY 435 -totalRows 2 -sliceRow 0
}

Write-Host "=== Assembling Culottes Walk Sheets ==="
$culWd = (Get-ChildItem -Path $brainDir -Filter "culottes_wd_strip*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$culWu = (Get-ChildItem -Path $brainDir -Filter "culottes_wu_strip*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$culWr = (Get-ChildItem -Path $brainDir -Filter "culottes_wr_strip*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

if ($culWd) {
    Slice-StripToWalkSheet -stripFile $culWd -outputSheet "$outfitsBaseDir\casual\culottes_walk_down.png" -targetW 190 -targetH 140 -topY 550
}
if ($culWu) {
    Slice-StripToWalkSheet -stripFile $culWu -outputSheet "$outfitsBaseDir\casual\culottes_walk_up.png" -targetW 190 -targetH 140 -topY 550
}
if ($culWr) {
    Slice-StripToWalkSheet -stripFile $culWr -outputSheet "$outfitsBaseDir\casual\culottes_walk_right.png" -targetW 160 -targetH 140 -topY 540 -totalRows 2 -sliceRow 0
}

Write-Host "=== Assembling Henley Shirt Walk Sheets ==="
$henWd = (Get-ChildItem -Path $brainDir -Filter "henley_wd_strip*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$henWu = (Get-ChildItem -Path $brainDir -Filter "henley_wu_strip*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$henWr = (Get-ChildItem -Path $brainDir -Filter "henley_wr_strip*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

if ($henWd) {
    Slice-StripToWalkSheet -stripFile $henWd -outputSheet "$outfitsBaseDir\casual\henley_shirt_walk_down.png" -targetW 200 -targetH 130 -topY 420
}
if ($henWu) {
    Slice-StripToWalkSheet -stripFile $henWu -outputSheet "$outfitsBaseDir\casual\henley_shirt_walk_up.png" -targetW 200 -targetH 130 -topY 420 -totalRows 2 -sliceRow 0
}
if ($henWr) {
    Slice-StripToWalkSheet -stripFile $henWr -outputSheet "$outfitsBaseDir\casual\henley_shirt_walk_right.png" -targetW 180 -targetH 130 -topY 415
}

Write-Host "=== Assembling Jeans Regular Walk Sheets ==="
$jeansWd = (Get-ChildItem -Path $brainDir -Filter "jeans_wd_strip*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

if ($jeansWd) {
    Slice-StripToWalkSheet -stripFile $jeansWd -outputSheet "$outfitsBaseDir\casual\jeans_regular_walk_down.png" -targetW 180 -targetH 210 -topY 540
}

Write-Host "=== Assembly Complete ==="
