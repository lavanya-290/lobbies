Add-Type -AssemblyName System.Drawing

$charactersDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters"
$outfitsDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\outfits"
$scratchDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch"

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

function Render-AlignedItemToCanvas($rawItemPath, $targetW, $targetH, $topY, $bottomY = -1, $centerX = 160) {
    $raw = [System.Drawing.Bitmap]::FromFile($rawItemPath)
    $bbox = Get-TightBBox $raw
    if (-not $bbox) { $raw.Dispose(); return $null }
    $cropped = $raw.Clone($bbox, $raw.PixelFormat)
    $raw.Dispose()

    $canvas = New-Object System.Drawing.Bitmap 321, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

    $scaleX = $targetW / $cropped.Width
    $scaleY = if ($targetH -gt 0) { $targetH / $cropped.Height } else { $scaleX }
    $scale = [Math]::Min($scaleX, $scaleY)
    $drawW = [int]($cropped.Width * $scale)
    $drawH = [int]($cropped.Height * $scale)
    $destX = $centerX - [int]($drawW / 2)
    $destY = if ($bottomY -gt 0) { $bottomY - $drawH } else { $topY }

    $g.DrawImage($cropped, $destX, $destY, $drawW, $drawH)
    $cropped.Dispose()
    $g.Dispose()
    return $canvas
}

function Composite-BaseAndLayers($basePath, $layerBitmaps, $outputPath) {
    $baseBmp = [System.Drawing.Bitmap]::FromFile($basePath)
    $finalBmp = New-Object System.Drawing.Bitmap 321, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($finalBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 24, 26, 36))
    $g.FillRectangle($brush, 0, 0, 321, 767)
    $brush.Dispose()

    $g.DrawImage($baseBmp, 0, 0)
    $baseBmp.Dispose()

    foreach ($layer in $layerBitmaps) {
        if ($layer) {
            $g.DrawImage($layer, 0, 0)
            $layer.Dispose()
        }
    }

    $g.Dispose()
    $finalBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $finalBmp.Dispose()
    Write-Host "Created test composite: $outputPath"
}

Write-Host "=== Rendering Corrected Alignment Tests ==="

# 1. Female: Crop Top + Culottes + Conical Hat
$hatCorrected = Render-AlignedItemToCanvas "$outfitsDir\japanese\conical_hat_idle.png" 280 175 2 -1 160
$cropCorrected = Render-AlignedItemToCanvas "$outfitsDir\casual\crop_top_idle.png" 240 200 294 -1 160
$culottesCorrected = Render-AlignedItemToCanvas "$outfitsDir\casual\culottes_idle.png" 200 210 475 -1 160

Composite-BaseAndLayers `
    "$charactersDir\base_female_idle.png" `
    @($cropCorrected, $culottesCorrected, $hatCorrected) `
    "$scratchDir\corrected_female_casual.png"

# 2. Male: Henley Shirt + Jeans + Tricorn Hat
$tricornCorrected = Render-AlignedItemToCanvas "$outfitsDir\pirate\tricorn_hat_idle.png" 280 175 2 -1 160
$henleyCorrected = Render-AlignedItemToCanvas "$outfitsDir\casual\henley_shirt_idle.png" 260 230 292 -1 160
$jeansCorrected = Render-AlignedItemToCanvas "$outfitsDir\casual\jeans_regular_idle.png" 185 290 470 -1 160

Composite-BaseAndLayers `
    "$charactersDir\base_male_idle.png" `
    @($henleyCorrected, $jeansCorrected, $tricornCorrected) `
    "$scratchDir\corrected_male_casual.png"

# 3. Female: Kimono Casual + Geta Sandals
$kimonoCorrected = Render-AlignedItemToCanvas "$outfitsDir\japanese\kimono_casual_idle.png" 260 440 292 -1 160
$getaCorrected = Render-AlignedItemToCanvas "$outfitsDir\japanese\geta_sandals_idle.png" 175 100 -1 762 160

Composite-BaseAndLayers `
    "$charactersDir\base_female_idle.png" `
    @($kimonoCorrected, $getaCorrected) `
    "$scratchDir\corrected_female_kimono.png"

# 4. Male: Captain's Coat + Sash & Boots
$coatCorrected = Render-AlignedItemToCanvas "$outfitsDir\pirate\captains_coat_idle.png" 270 430 292 -1 160
$sashBootsCorrected = Render-AlignedItemToCanvas "$outfitsDir\pirate\sash_and_boots_idle.png" 185 290 -1 762 160

Composite-BaseAndLayers `
    "$charactersDir\base_male_idle.png" `
    @($coatCorrected, $sashBootsCorrected) `
    "$scratchDir\corrected_male_pirate.png"
