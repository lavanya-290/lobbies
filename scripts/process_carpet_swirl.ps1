Add-Type -AssemblyName System.Drawing

$rawPath = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\carpet_swirl_1791208113214.jpg"
$outPath = "client\public\assets\furniture\quirky\carpet_swirl.png"

$bmp = [System.Drawing.Bitmap]::FromFile($rawPath)
$w = $bmp.Width
$h = $bmp.Height

# Make transparent
$transBmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.R -gt 220 -and $p.G -gt 220 -and $p.B -gt 220) {
            $transBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            $transBmp.SetPixel($x, $y, $p)
        }
    }
}
$bmp.Dispose()

# Tight bbox
$minX = $w; $maxX = 0; $minY = $h; $maxY = 0
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        if ($transBmp.GetPixel($x, $y).A -gt 25) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$croppedW = $maxX - $minX + 1
$croppedH = $maxY - $minY + 1
$cropped = $transBmp.Clone((New-Object System.Drawing.Rectangle $minX, $minY, $croppedW, $croppedH), $transBmp.PixelFormat)
$transBmp.Dispose()

# Target size: width = 140px, maintaining aspect ratio
$scale = 140 / $croppedW
$targetW = 140
$targetH = [int]($croppedH * $scale)

$finalBmp = New-Object System.Drawing.Bitmap $targetW, $targetH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($finalBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.DrawImage($cropped, 0, 0, $targetW, $targetH)

$finalBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$cropped.Dispose()
$finalBmp.Dispose()
$g.Dispose()

Write-Host "Processed carpet_swirl -> $outPath ($targetW x $targetH)"
