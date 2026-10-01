Add-Type -AssemblyName System.Drawing

$scratchDir = 'C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\79e822d2-ec08-4712-9739-215ac9de8943\scratch\naive_composites'
if (!(Test-Path $scratchDir)) { New-Item -ItemType Directory -Path $scratchDir -Force | Out-Null }

$testPairs = @(
    @{ Category = 'top'; Outfit = 'client/public/assets/outfits/casual/henley_shirt_idle.png'; Base = 'client/public/assets/characters/male_idle.png' },
    @{ Category = 'bottom'; Outfit = 'client/public/assets/outfits/casual/jeans_regular_idle.png'; Base = 'client/public/assets/characters/male_idle.png' },
    @{ Category = 'hat'; Outfit = 'client/public/assets/outfits/japanese/conical_hat_idle.png'; Base = 'client/public/assets/characters/female_idle.png' },
    @{ Category = 'shoes'; Outfit = 'client/public/assets/outfits/japanese/geta_sandals_idle.png'; Base = 'client/public/assets/characters/female_idle.png' },
    @{ Category = 'dress'; Outfit = 'client/public/assets/outfits/japanese/kimono_casual_idle.png'; Base = 'client/public/assets/characters/female_idle.png' }
)

foreach ($p in $testPairs) {
    $outfitBmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $p.Outfit).Path)
    $baseBmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $p.Base).Path)
    
    $w = [Math]::Max($outfitBmp.Width, $baseBmp.Width)
    $h = [Math]::Max($outfitBmp.Height, $baseBmp.Height)
    
    $composite = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($composite)
    
    # Draw base at (0, 0)
    $g.DrawImage($baseBmp, 0, 0, $baseBmp.Width, $baseBmp.Height)
    # Draw outfit naively at (0, 0)
    $g.DrawImage($outfitBmp, 0, 0, $outfitBmp.Width, $outfitBmp.Height)
    
    $g.Dispose()
    $outPath = Join-Path $scratchDir "naive_$($p.Category).png"
    $composite.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $composite.Dispose()
    $outfitBmp.Dispose()
    $baseBmp.Dispose()
    
    Write-Output "Saved naive composite for $($p.Category) to $outPath ($w x $h)"
}
