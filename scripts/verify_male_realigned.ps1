Add-Type -AssemblyName System.Drawing

$charDir = "client\public\assets\characters"
$outfitDir = "client\public\assets\outfits"
$scratchDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch"

$comp = New-Object System.Drawing.Bitmap 1284, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($comp)

$bg = [System.Drawing.Bitmap]::FromFile("$charDir\base_male_walk_down.png")
$jeans = [System.Drawing.Bitmap]::FromFile("$outfitDir\casual\jeans_regular_walk_down.png")
$henley = [System.Drawing.Bitmap]::FromFile("$outfitDir\casual\henley_shirt_walk_down.png")
$hat = [System.Drawing.Bitmap]::FromFile("$outfitDir\pirate\tricorn_hat_walk_down.png")
$eye = [System.Drawing.Bitmap]::FromFile("$outfitDir\pirate\eyepatch_accessory_walk_down.png")

$g.DrawImage($bg, 0, 0, 1284, 767)
$g.DrawImage($jeans, 0, 0, 1284, 767)
$g.DrawImage($henley, 0, 0, 1284, 767)
$g.DrawImage($hat, 0, 0, 1284, 767)
$g.DrawImage($eye, 0, 0, 1284, 767)

$testOut = "$scratchDir\verified_realigned_male_casual_pirate_walk_down.png"
$comp.Save($testOut, [System.Drawing.Imaging.ImageFormat]::Png)

$bg.Dispose(); $jeans.Dispose(); $henley.Dispose(); $hat.Dispose(); $eye.Dispose(); $comp.Dispose(); $g.Dispose()
Write-Host "Verified composite saved: $testOut"
