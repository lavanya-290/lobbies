Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\79e822d2-ec08-4712-9739-215ac9de8943"
$charDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters"
$outfitsDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\outfits"

function Create-CompositedWalkStrip {
    param (
        [string]$baseSheetPath,
        [string[]]$outfitSheetPaths,
        [string]$outputPath,
        [string]$title
    )

    $base = [System.Drawing.Bitmap]::FromFile($baseSheetPath)
    $canvas = New-Object System.Drawing.Bitmap 1284, 850, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

    # Background
    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 30, 32, 45))
    $g.FillRectangle($bgBrush, 0, 0, 1284, 850)
    $bgBrush.Dispose()

    # Draw base character
    $g.DrawImage($base, 0, 40)
    $base.Dispose()

    # Draw outfit layers
    foreach ($op in $outfitSheetPaths) {
        if (Test-Path $op) {
            $layer = [System.Drawing.Bitmap]::FromFile($op)
            $g.DrawImage($layer, 0, 40)
            $layer.Dispose()
        }
    }

    # Title & Frame labels
    $font = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
    $lblFont = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Regular)
    $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $g.DrawString($title, $font, $textBrush, 20, 10)

    for ($i = 0; $i -lt 4; $i++) {
        $g.DrawString("Frame $i", $lblFont, $textBrush, ($i * 321 + 130), 815)
    }

    $font.Dispose()
    $lblFont.Dispose()
    $textBrush.Dispose()
    $g.Dispose()

    $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    Write-Host "Created composite preview: $outputPath"
}

# 1. Female walking right: base + crop_top + conical_hat
Create-CompositedWalkStrip `
    -baseSheetPath "$charDir\female_walk_right.png" `
    -outfitSheetPaths @(
        "$outfitsDir\casual\crop_top_walk_right.png",
        "$outfitsDir\casual\culottes_walk_right.png",
        "$outfitsDir\japanese\conical_hat_walk_right.png"
    ) `
    -outputPath "$brainDir\preview_female_walk_right_layered.png" `
    -title "Female Walk Right: Base + Crop Top + Culottes + Conical Hat"

# 2. Female walking down: base + crop_top + culottes
Create-CompositedWalkStrip `
    -baseSheetPath "$charDir\female_walk_down.png" `
    -outfitSheetPaths @(
        "$outfitsDir\casual\crop_top_walk_down.png",
        "$outfitsDir\casual\culottes_walk_down.png"
    ) `
    -outputPath "$brainDir\preview_female_walk_down_layered.png" `
    -title "Female Walk Down: Base + Crop Top + Culottes"

# 3. Male walking down: base + henley_shirt + tricorn_hat
Create-CompositedWalkStrip `
    -baseSheetPath "$charDir\male_walk_down.png" `
    -outfitSheetPaths @(
        "$outfitsDir\casual\henley_shirt_walk_down.png",
        "$outfitsDir\casual\jeans_regular_walk_down.png",
        "$outfitsDir\pirate\tricorn_hat_walk_down.png"
    ) `
    -outputPath "$brainDir\preview_male_walk_down_layered.png" `
    -title "Male Walk Down: Base + Henley Shirt + Jeans + Tricorn Hat"
