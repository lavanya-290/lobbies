Add-Type -AssemblyName System.Drawing

$femaleBase = [System.Drawing.Bitmap]::FromFile((Resolve-Path 'client/public/assets/characters/base_female_idle.png').Path)
$maleBase = [System.Drawing.Bitmap]::FromFile((Resolve-Path 'client/public/assets/characters/base_male_idle.png').Path)
$hat = [System.Drawing.Bitmap]::FromFile((Resolve-Path 'client/public/assets/outfits/japanese/conical_hat_idle.png').Path)

$compF = New-Object System.Drawing.Bitmap 321, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gF = [System.Drawing.Graphics]::FromImage($compF)
$gF.DrawImage($femaleBase, 0, 0)
$gF.DrawImage($hat, 0, 0)
$gF.Dispose()

$compM = New-Object System.Drawing.Bitmap 321, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gM = [System.Drawing.Graphics]::FromImage($compM)
$gM.DrawImage($maleBase, 0, 0)
$gM.DrawImage($hat, 0, 0)
$gM.Dispose()

$scratchDir = 'C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch'
if (!(Test-Path $scratchDir)) { New-Item -ItemType Directory -Path $scratchDir -Force | Out-Null }

$compF.Save((Join-Path $scratchDir 'test_female_hat.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$compM.Save((Join-Path $scratchDir 'test_male_hat.png'), [System.Drawing.Imaging.ImageFormat]::Png)

$femaleBase.Dispose()
$maleBase.Dispose()
$hat.Dispose()
$compF.Dispose()
$compM.Dispose()
Write-Output "Test composite complete!"
