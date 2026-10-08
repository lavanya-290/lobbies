Add-Type -AssemblyName System.Drawing

$charDir = "client\public\assets\characters"
$outfitDir = "client\public\assets\outfits"
$scratchDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch"

function MakeComposite321($bgPath, $layers, $outPath) {
    $comp = New-Object System.Drawing.Bitmap 321, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($comp)
    
    $bg = [System.Drawing.Bitmap]::FromFile($bgPath)
    $g.DrawImage($bg, 0, 0, 321, 767)
    $bg.Dispose()

    foreach ($layer in $layers) {
        if (Test-Path $layer) {
            $l = [System.Drawing.Bitmap]::FromFile($layer)
            $g.DrawImage($l, 0, 0, 321, 767)
            $l.Dispose()
        }
    }

    $comp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $comp.Dispose()
    $g.Dispose()
    Write-Host "Created: $outPath"
}

# Idle Female (crop_top + culottes + conical_hat)
MakeComposite321 "$charDir\base_female_idle.png" @(
    "$outfitDir\casual\culottes_idle.png",
    "$outfitDir\casual\crop_top_idle.png",
    "$outfitDir\japanese\conical_hat_idle.png"
) "$scratchDir\audit_female_idle.png"

# Idle Male (henley + jeans + tricorn + eyepatch)
MakeComposite321 "$charDir\base_male_idle.png" @(
    "$outfitDir\casual\jeans_regular_idle.png",
    "$outfitDir\casual\henley_shirt_idle.png",
    "$outfitDir\pirate\tricorn_hat_idle.png",
    "$outfitDir\pirate\eyepatch_accessory_idle.png"
) "$scratchDir\audit_male_idle.png"
