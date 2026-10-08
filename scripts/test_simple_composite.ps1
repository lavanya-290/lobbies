Add-Type -AssemblyName System.Drawing

$charactersDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters"
$outfitsDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\outfits"
$scratchDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch"

$base = [System.Drawing.Bitmap]::FromFile("$charactersDir\base_female_idle.png")
$crop = [System.Drawing.Bitmap]::FromFile("$outfitsDir\casual\crop_top_idle.png")

Write-Host "Base: $($base.Width)x$($base.Height)"
Write-Host "Crop: $($crop.Width)x$($crop.Height)"

# Create a composite canvas
$canvas = New-Object System.Drawing.Bitmap 321, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($canvas)

$g.DrawImage($base, 0, 0)
# In current game: crop_top_idle is already a 321x767 canvas! Let's draw it directly at 0, 0!
$g.DrawImage($crop, 0, 0)

# Now what if we shift it up?
# Current crop_top is at Y=324. To put it at Y=294, shift dy = -30
$canvasShifted = New-Object System.Drawing.Bitmap 321, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g2 = [System.Drawing.Graphics]::FromImage($canvasShifted)
$g2.DrawImage($base, 0, 0)
$g2.DrawImage($crop, 0, -30)

$canvas.Save("$scratchDir\crop_direct_0_0.png", [System.Drawing.Imaging.ImageFormat]::Png)
$canvasShifted.Save("$scratchDir\crop_shifted_minus30.png", [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Saved crop_direct_0_0.png and crop_shifted_minus30.png"

$base.Dispose()
$crop.Dispose()
$g.Dispose()
$g2.Dispose()
$canvas.Dispose()
$canvasShifted.Dispose()
