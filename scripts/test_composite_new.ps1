Add-Type -AssemblyName System.Drawing

$charactersDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters"
$outfitsDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\outfits"
$scratchDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch"

if (-not (Test-Path $scratchDir)) {
    New-Item -ItemType Directory -Path $scratchDir -Force | Out-Null
}

$base = [System.Drawing.Bitmap]::FromFile("$charactersDir\base_female_walk_right.png")
$kimono = [System.Drawing.Bitmap]::FromFile("$outfitsDir\japanese\kimono_casual_walk_right.png")

$comp = New-Object System.Drawing.Bitmap 1284, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($comp)

# Draw base, then kimono
$g.DrawImage($base, 0, 0, 1284, 767)
$g.DrawImage($kimono, 0, 0, 1284, 767)

$outputPath = "$scratchDir\test_kimono_wr_composite.png"
$comp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$base.Dispose()
$kimono.Dispose()
$comp.Dispose()
$g.Dispose()

Write-Host "Composite created: $outputPath"
