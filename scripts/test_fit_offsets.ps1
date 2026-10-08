Add-Type -AssemblyName System.Drawing

$charactersDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters"
$outfitsDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\outfits"
$scratchDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch"

function Test-Fit($baseFile, $layers, $outFile) {
    $base = [System.Drawing.Bitmap]::FromFile($baseFile)
    $canvas = New-Object System.Drawing.Bitmap 321, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.DrawImage($base, 0, 0)
    $base.Dispose()

    foreach ($l in $layers) {
        $img = [System.Drawing.Bitmap]::FromFile($l.Path)
        $g.DrawImage($img, $l.Dx, $l.Dy)
        $img.Dispose()
    }

    $g.Dispose()
    $canvas.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    Write-Host "Saved $outFile"
}

# 1. Female Casual: Crop Top (dy = -30), Culottes (dy = -45), Conical Hat (dy = 0)
Test-Fit "$charactersDir\base_female_idle.png" @(
    @{ Path = "$outfitsDir\casual\crop_top_idle.png"; Dx = 0; Dy = -30 },
    @{ Path = "$outfitsDir\casual\culottes_idle.png"; Dx = 0; Dy = -45 },
    @{ Path = "$outfitsDir\japanese\conical_hat_idle.png"; Dx = 0; Dy = 0 }
) "$scratchDir\fit_female_casual.png"

# 2. Male Casual: Henley (dy = -30), Jeans (dy = -45), Tricorn (dy = -18)
Test-Fit "$charactersDir\base_male_idle.png" @(
    @{ Path = "$outfitsDir\casual\henley_shirt_idle.png"; Dx = 0; Dy = -30 },
    @{ Path = "$outfitsDir\casual\jeans_regular_idle.png"; Dx = 0; Dy = -45 },
    @{ Path = "$outfitsDir\pirate\tricorn_hat_idle.png"; Dx = 0; Dy = -18 }
) "$scratchDir\fit_male_casual.png"

# 3. Female Japanese: Kimono (dy = -28), Geta (dy = 0)
Test-Fit "$charactersDir\base_female_idle.png" @(
    @{ Path = "$outfitsDir\japanese\kimono_casual_idle.png"; Dx = 0; Dy = -28 },
    @{ Path = "$outfitsDir\japanese\geta_sandals_idle.png"; Dx = 0; Dy = 0 }
) "$scratchDir\fit_female_japanese.png"

# 4. Male Pirate: Captain's Coat (dy = -28), Sash & Boots (dy = 0), Tricorn (dy = -18)
Test-Fit "$charactersDir\base_male_idle.png" @(
    @{ Path = "$outfitsDir\pirate\captains_coat_idle.png"; Dx = 0; Dy = -28 },
    @{ Path = "$outfitsDir\pirate\sash_and_boots_idle.png"; Dx = 0; Dy = 0 },
    @{ Path = "$outfitsDir\pirate\tricorn_hat_idle.png"; Dx = 0; Dy = -18 }
) "$scratchDir\fit_male_pirate.png"
