Add-Type -AssemblyName System.Drawing

$charactersDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters"
$outfitsDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\outfits"
$scratchDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch"

function Get-AlphaBoundingBox($bmp, $startX, $startY, $w, $h) {
    $minX = $w; $minY = $h; $maxX = 0; $maxY = 0
    $found = $false
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $p = $bmp.GetPixel($startX + $x, $startY + $y)
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
    return [PSCustomObject]@{
        X = $minX
        Y = $minY
        Width = ($maxX - $minX + 1)
        Height = ($maxY - $minY + 1)
        Bottom = $maxY
        CenterX = [int](($minX + $maxX) / 2)
    }
}

Write-Host "=========================================================="
Write-Host "1. MEASURING CURRENT BASE CHARACTER IDLE CANVASES (321x767)"
Write-Host "=========================================================="

foreach ($baseName in @("base_female_idle", "base_male_idle")) {
    $file = "$charactersDir\$baseName.png"
    $bmp = [System.Drawing.Bitmap]::FromFile($file)
    $box = Get-AlphaBoundingBox $bmp 0 0 321 767
    
    # Anatomy landmarks based on color and horizontal width transitions:
    # 1. Head top: where first non-alpha pixels appear
    # 2. Chin/Neck: bottom of head sphere
    # 3. Shoulders: top of torso garment
    # 4. Waist: underwear top/waistline
    # 5. Ankles: bottom of legs / top of feet
    # 6. Soles: bottommost non-alpha pixel

    # Let's inspect rows:
    $headTop = $box.Y
    $chinY = 292
    $shoulderY = 324
    $waistY = 515
    $ankleY = 662
    $soleBottom = $box.Bottom

    Write-Host "$baseName :"
    Write-Host "  Canvas Size: $($bmp.Width)x$($bmp.Height)"
    Write-Host "  Total Character Box: X=$($box.X)..$($box.X + $box.Width - 1), Y=$($box.Y)..$($box.Bottom) (W=$($box.Width), H=$($box.Height), CenterX=$($box.CenterX))"
    Write-Host "  Anatomy Segments:"
    Write-Host "    Head:     Y=$headTop .. $chinY (Height=$($chinY - $headTop + 1), Width ~246, CenterX=160)"
    Write-Host "    Torso:    Y=$shoulderY .. $waistY (Height=$($waistY - $shoulderY + 1), Width ~200, CenterX=160)"
    Write-Host "    Legs:     Y=$waistY .. $ankleY (Height=$($ankleY - $waistY + 1), Width ~150, CenterX=160)"
    Write-Host "    Feet:     Y=$ankleY .. $soleBottom (Height=$($soleBottom - $ankleY + 1), Width ~153, CenterX=160)"
    Write-Host ""
    $bmp.Dispose()
}

Write-Host "=========================================================="
Write-Host "2. MEASURING CURRENT OUTFIT IDLE ASSETS AGAINST BASE"
Write-Host "=========================================================="
$testItems = @(
    @{ Name = "crop_top_idle"; Cat = "top"; File = "$outfitsDir\casual\crop_top_idle.png" }
    @{ Name = "henley_shirt_idle"; Cat = "top"; File = "$outfitsDir\casual\henley_shirt_idle.png" }
    @{ Name = "culottes_idle"; Cat = "bottom"; File = "$outfitsDir\casual\culottes_idle.png" }
    @{ Name = "jeans_regular_idle"; Cat = "bottom"; File = "$outfitsDir\casual\jeans_regular_idle.png" }
    @{ Name = "conical_hat_idle"; Cat = "headwear"; File = "$outfitsDir\oriental\conical_hat_idle.png" }
    @{ Name = "tricorn_hat_idle"; Cat = "headwear"; File = "$outfitsDir\pirate\tricorn_hat_idle.png" }
    @{ Name = "geta_sandals_idle"; Cat = "footwear"; File = "$outfitsDir\oriental\geta_sandals_idle.png" }
    @{ Name = "sash_and_boots_idle"; Cat = "footwear"; File = "$outfitsDir\pirate\sash_and_boots_idle.png" }
    @{ Name = "kimono_casual_idle"; Cat = "dress"; File = "$outfitsDir\oriental\kimono_casual_idle.png" }
    @{ Name = "captains_coat_idle"; Cat = "top/coat"; File = "$outfitsDir\pirate\captains_coat_idle.png" }
)

foreach ($item in $testItems) {
    if (Test-Path $item.File) {
        $bmp = [System.Drawing.Bitmap]::FromFile($item.File)
        $b = Get-AlphaBoundingBox $bmp 0 0 $bmp.Width $bmp.Height
        Write-Host "$($item.Name) ($($item.Cat)):"
        Write-Host "  Bounds: X=$($b.X), Y=$($b.Y), W=$($b.Width), H=$($b.Height), Bottom=$($b.Bottom), CenterX=$($b.CenterX)"
        $bmp.Dispose()
    }
}

Write-Host ""
Write-Host "=========================================================="
Write-Host "3. COMPOSITING TEST IMAGES (IDLE AND WALK)"
Write-Host "=========================================================="

function Composite-Layers($basePath, $layers, $outputPath, $title) {
    $baseBmp = [System.Drawing.Bitmap]::FromFile($basePath)
    $compBmp = New-Object System.Drawing.Bitmap $baseBmp.Width, $baseBmp.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($compBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

    # Draw dark background so transparency is clearly visible
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 24, 26, 36))
    $g.FillRectangle($brush, 0, 0, $compBmp.Width, $compBmp.Height)
    $brush.Dispose()

    # Draw base
    $g.DrawImage($baseBmp, 0, 0)
    $baseBmp.Dispose()

    # Draw layers
    foreach ($layerPath in $layers) {
        if (Test-Path $layerPath) {
            $layerBmp = [System.Drawing.Bitmap]::FromFile($layerPath)
            $g.DrawImage($layerBmp, 0, 0)
            $layerBmp.Dispose()
        }
    }

    $g.Dispose()
    $compBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $compBmp.Dispose()
    Write-Host "Saved test composite: $outputPath"
}

# 1. Idle test composite: Female + crop_top + culottes + conical_hat
Composite-Layers `
    "$charactersDir\base_female_idle.png" `
    @("$outfitsDir\casual\crop_top_idle.png", "$outfitsDir\casual\culottes_idle.png", "$outfitsDir\japanese\conical_hat_idle.png") `
    "$scratchDir\test_composite_female_idle.png" `
    "Female Idle: Crop Top + Culottes + Conical Hat"

# 2. Idle test composite: Male + henley_shirt + jeans_regular + tricorn_hat
Composite-Layers `
    "$charactersDir\base_male_idle.png" `
    @("$outfitsDir\casual\henley_shirt_idle.png", "$outfitsDir\casual\jeans_regular_idle.png", "$outfitsDir\pirate\tricorn_hat_idle.png") `
    "$scratchDir\test_composite_male_idle.png" `
    "Male Idle: Henley + Jeans + Tricorn"

# 3. Idle test composite: Female + kimono_casual + geta_sandals
Composite-Layers `
    "$charactersDir\base_female_idle.png" `
    @("$outfitsDir\japanese\kimono_casual_idle.png", "$outfitsDir\japanese\geta_sandals_idle.png") `
    "$scratchDir\test_composite_female_kimono.png" `
    "Female Idle: Kimono + Geta"

# 4. Idle test composite: Male + captains_coat + sash_and_boots
Composite-Layers `
    "$charactersDir\base_male_idle.png" `
    @("$outfitsDir\pirate\captains_coat_idle.png", "$outfitsDir\pirate\sash_and_boots_idle.png") `
    "$scratchDir\test_composite_male_pirate.png" `
    "Male Idle: Captain's Coat + Sash & Boots"

# 5. Walk down test composite: Female + crop_top_walk_down + culottes_walk_down + conical_hat_walk_down
Composite-Layers `
    "$charactersDir\base_female_walk_down.png" `
    @("$outfitsDir\casual\crop_top_walk_down.png", "$outfitsDir\casual\culottes_walk_down.png", "$outfitsDir\japanese\conical_hat_walk_down.png") `
    "$scratchDir\test_composite_female_walk_down.png" `
    "Female Walk Down: Crop Top + Culottes + Conical Hat"
