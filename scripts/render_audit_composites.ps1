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

# 1. Casual Female Walk Down (crop_top + culottes)
MakeComposite "$charDir\base_female_walk_down.png" @(
    "$outfitDir\casual\culottes_walk_down.png",
    "$outfitDir\casual\crop_top_walk_down.png"
) "$scratchDir\audit_casual_female_walk_down.png"

# 2. Casual Male Walk Down (henley + old jeans)
MakeComposite "$charDir\base_male_walk_down.png" @(
    "$outfitDir\casual\jeans_regular_walk_down.png",
    "$outfitDir\casual\henley_shirt_walk_down.png"
) "$scratchDir\audit_casual_male_walk_down.png"

# 3. Headwear Walk Down (conical_hat + tricorn_hat)
MakeComposite "$charDir\base_female_walk_down.png" @(
    "$outfitDir\japanese\conical_hat_walk_down.png"
) "$scratchDir\audit_conical_hat_walk_down.png"

MakeComposite "$charDir\base_male_walk_down.png" @(
    "$outfitDir\pirate\tricorn_hat_walk_down.png",
    "$outfitDir\pirate\eyepatch_accessory_walk_down.png"
) "$scratchDir\audit_tricorn_eyepatch_walk_down.png"
