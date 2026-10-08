Add-Type -AssemblyName System.Drawing

$charactersDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters"
$outfitsDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\outfits"
$scratchDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch"

function Get-TightBBox($bmp) {
    $minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
    $has = $false
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.A -gt 25) {
                $has = $true
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if (-not $has) { return $null }
    return New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1)
}

# Load the raw strip from crop_top_walk_down if we extract each frame
$walkDownSheet = [System.Drawing.Bitmap]::FromFile("$outfitsDir\casual\crop_top_walk_down.png")
$fixedSheet = New-Object System.Drawing.Bitmap 1284, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gFixed = [System.Drawing.Graphics]::FromImage($fixedSheet)

# Each frame in walkDownSheet is currently at 321 width
for ($i = 0; $i -lt 4; $i++) {
    $frameRect = New-Object System.Drawing.Rectangle ($i * 321), 0, 321, 767
    $frameBmp = $walkDownSheet.Clone($frameRect, $walkDownSheet.PixelFormat)
    $bbox = Get-TightBBox $frameBmp
    if ($bbox) {
        $tight = $frameBmp.Clone($bbox, $frameBmp.PixelFormat)
        
        # Scale to match true torso dimensions: width ~230, height ~180
        $scale = 230 / $tight.Width
        $drawW = [int]($tight.Width * $scale)
        $drawH = [int]($tight.Height * $scale)
        $destX = ($i * 321) + 160 - [int]($drawW / 2)
        $destY = 295

        $gFixed.DrawImage($tight, $destX, $destY, $drawW, $drawH)
        $tight.Dispose()
    }
    $frameBmp.Dispose()
}

$walkDownSheet.Dispose()
$gFixed.Dispose()

# Now composite onto base_female_walk_down
$baseWalk = [System.Drawing.Bitmap]::FromFile("$charactersDir\base_female_walk_down.png")
$comp = New-Object System.Drawing.Bitmap 1284, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gComp = [System.Drawing.Graphics]::FromImage($comp)

# Background
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 24, 26, 36))
$gComp.FillRectangle($brush, 0, 0, 1284, 767)
$brush.Dispose()

$gComp.DrawImage($baseWalk, 0, 0)
$gComp.DrawImage($fixedSheet, 0, 0)

$baseWalk.Dispose()
$fixedSheet.Dispose()
$gComp.Dispose()

$comp.Save("$scratchDir\crop_top_walk_down_corrected.png", [System.Drawing.Imaging.ImageFormat]::Png)
$comp.Dispose()
Write-Host "Saved crop_top_walk_down_corrected.png"
