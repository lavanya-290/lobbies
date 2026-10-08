Add-Type -AssemblyName System.Drawing

$charDir = "client\public\assets\characters"
$outfitDir = "client\public\assets\outfits"
$scratchDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch"

function MakeComposite($bgPath, $layers, $outPath) {
    $comp = New-Object System.Drawing.Bitmap 1284, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($comp)
    
    $bg = [System.Drawing.Bitmap]::FromFile($bgPath)
    $g.DrawImage($bg, 0, 0, 1284, 767)
    $bg.Dispose()

    foreach ($layer in $layers) {
        if (Test-Path $layer) {
            $l = [System.Drawing.Bitmap]::FromFile($layer)
            $g.DrawImage($l, 0, 0, 1284, 767)
            $l.Dispose()
        }
    }

    $comp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $comp.Dispose()
    $g.Dispose()
    Write-Host "Created: $outPath"
}

# 1. Full Pirate Male Walk Right: Male Base + Jeans + Captain's Coat + Sash & Boots + Tricorn Hat + Eyepatch
MakeComposite "$charDir\base_male_walk_right.png" @(
    "$outfitDir\casual\jeans_regular_walk_right.png",
    "$outfitDir\pirate\sash_and_boots_walk_right.png",
    "$outfitDir\pirate\captains_coat_walk_right.png",
    "$outfitDir\pirate\tricorn_hat_walk_right.png",
    "$outfitDir\pirate\eyepatch_accessory_walk_right.png"
) "$scratchDir\final_pirate_male_walk_right.png"

# 2. Full Japanese Male Walk Up: Male Base + Hakama Pants + Henley Shirt + Conical Hat
MakeComposite "$charDir\base_male_walk_up.png" @(
    "$outfitDir\japanese\hakama_pants_walk_up.png",
    "$outfitDir\casual\henley_shirt_walk_up.png",
    "$outfitDir\japanese\conical_hat_walk_up.png"
) "$scratchDir\final_japanese_male_walk_up.png"

# 3. Full Japanese Female Walk Down: Female Base + Geta Sandals + Yukata Summer + Conical Hat
MakeComposite "$charDir\base_female_walk_down.png" @(
    "$outfitDir\japanese\geta_sandals_walk_down.png",
    "$outfitDir\japanese\yukata_summer_walk_down.png",
    "$outfitDir\japanese\conical_hat_walk_down.png"
) "$scratchDir\final_japanese_female_walk_down.png"

# 4. Full Casual Female Walk Right: Female Base + Culottes + Crop Top
MakeComposite "$charDir\base_female_walk_right.png" @(
    "$outfitDir\casual\culottes_walk_right.png",
    "$outfitDir\casual\crop_top_walk_right.png"
) "$scratchDir\final_casual_female_walk_right.png"
