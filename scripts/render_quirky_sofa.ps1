Add-Type -AssemblyName System.Drawing

$outDir = "client\public\assets\furniture\quirky"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$w = 144
$h = 96
$bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

$colOutline = [System.Drawing.ColorTranslator]::FromHtml("#1b1b2f") # Crisp 1px Habbo dark outline
$colVelvetShadow = [System.Drawing.ColorTranslator]::FromHtml("#832b05") # Deep rich terracotta/burnt orange shadow
$colVelvetMid = [System.Drawing.ColorTranslator]::FromHtml("#bd4407") # Mid-tone burnt orange
$colVelvetMain = [System.Drawing.ColorTranslator]::FromHtml("#e0560a") # Rich vibrant burnt orange velvet
$colVelvetLight = [System.Drawing.ColorTranslator]::FromHtml("#f37920") # Light face / cushion top
$colVelvetHighlight = [System.Drawing.ColorTranslator]::FromHtml("#faa755") # Plush highlight rim
$colBrass = [System.Drawing.ColorTranslator]::FromHtml("#d4ac0d")
$colDarkBrass = [System.Drawing.ColorTranslator]::FromHtml("#9a7d0a")

function DrawPoly($pts, $fillCol, $penCol, $graphics) {
    $brush = New-Object System.Drawing.SolidBrush $fillCol
    $pen = New-Object System.Drawing.Pen $penCol, 1
    $graphics.FillPolygon($brush, $pts)
    $graphics.DrawPolygon($pen, $pts)
    $brush.Dispose()
    $pen.Dispose()
}

# 1. Brass Tapered Legs (Rear Left & Rear Right)
# Rear Left Leg
DrawPoly @([System.Drawing.Point]::new(46, 56), [System.Drawing.Point]::new(51, 58), [System.Drawing.Point]::new(51, 74), [System.Drawing.Point]::new(46, 72)) $colDarkBrass $colOutline $g
# Rear Right Leg
DrawPoly @([System.Drawing.Point]::new(112, 48), [System.Drawing.Point]::new(117, 50), [System.Drawing.Point]::new(117, 66), [System.Drawing.Point]::new(112, 64)) $colDarkBrass $colOutline $g

# 2. Backrest (Outer Silhouette - high dramatic wave on left swooping down to right)
# From back corner (72, 30) rising up to (32, 10), sweeping down to (126, 38)
$backOuter = @(
    [System.Drawing.Point]::new(20, 52),
    [System.Drawing.Point]::new(20, 34),
    [System.Drawing.Point]::new(24, 20),
    [System.Drawing.Point]::new(36, 10),
    [System.Drawing.Point]::new(52, 8),
    [System.Drawing.Point]::new(72, 14),
    [System.Drawing.Point]::new(94, 22),
    [System.Drawing.Point]::new(114, 28),
    [System.Drawing.Point]::new(128, 36),
    [System.Drawing.Point]::new(128, 56),
    [System.Drawing.Point]::new(72, 70),
    [System.Drawing.Point]::new(20, 52)
)
DrawPoly $backOuter $colVelvetShadow $colOutline $g

# Backrest Inner Face (showing velvet depth & cushion roll)
$backInner = @(
    [System.Drawing.Point]::new(24, 48),
    [System.Drawing.Point]::new(24, 34),
    [System.Drawing.Point]::new(28, 22),
    [System.Drawing.Point]::new(38, 14),
    [System.Drawing.Point]::new(52, 12),
    [System.Drawing.Point]::new(72, 18),
    [System.Drawing.Point]::new(94, 26),
    [System.Drawing.Point]::new(114, 32),
    [System.Drawing.Point]::new(124, 40),
    [System.Drawing.Point]::new(124, 52),
    [System.Drawing.Point]::new(72, 64),
    [System.Drawing.Point]::new(24, 48)
)
DrawPoly $backInner $colVelvetMid $colOutline $g

# Crest Highlight on top curve of the wave
$crestHighlight = @(
    [System.Drawing.Point]::new(26, 22),
    [System.Drawing.Point]::new(36, 12),
    [System.Drawing.Point]::new(52, 10),
    [System.Drawing.Point]::new(72, 16),
    [System.Drawing.Point]::new(94, 24),
    [System.Drawing.Point]::new(114, 30),
    [System.Drawing.Point]::new(126, 38),
    [System.Drawing.Point]::new(124, 42),
    [System.Drawing.Point]::new(112, 34),
    [System.Drawing.Point]::new(92, 28),
    [System.Drawing.Point]::new(72, 20),
    [System.Drawing.Point]::new(52, 14),
    [System.Drawing.Point]::new(38, 16),
    [System.Drawing.Point]::new(30, 24)
)
DrawPoly $crestHighlight $colVelvetHighlight $colOutline $g

# 3. Base Frame / Skirt under seat cushion
$skirtPts = @(
    [System.Drawing.Point]::new(24, 60),
    [System.Drawing.Point]::new(72, 84),
    [System.Drawing.Point]::new(120, 60),
    [System.Drawing.Point]::new(120, 68),
    [System.Drawing.Point]::new(72, 92),
    [System.Drawing.Point]::new(24, 68)
)
DrawPoly $skirtPts $colVelvetShadow $colOutline $g

# Center dividing line for skirt
$penShadow = New-Object System.Drawing.Pen $colOutline, 1
$g.DrawLine($penShadow, 72, 84, 72, 92)
$penShadow.Dispose()

# 4. Main Thick Seat Cushion (2:1 Isometric Diamond)
# Cushion Top Surface
$cushionTop = @(
    [System.Drawing.Point]::new(24, 52),
    [System.Drawing.Point]::new(72, 76),
    [System.Drawing.Point]::new(120, 52),
    [System.Drawing.Point]::new(72, 28)
)
DrawPoly $cushionTop $colVelvetLight $colOutline $g

# Cushion Top Inner Glow / Tuft
$cushionTuft = @(
    [System.Drawing.Point]::new(36, 52),
    [System.Drawing.Point]::new(72, 70),
    [System.Drawing.Point]::new(108, 52),
    [System.Drawing.Point]::new(72, 34)
)
DrawPoly $cushionTuft $colVelvetHighlight ([System.Drawing.ColorTranslator]::FromHtml("#f89b4b")) $g

# Cushion Left-Front Face (in light)
$cushionLeft = @(
    [System.Drawing.Point]::new(24, 52),
    [System.Drawing.Point]::new(72, 76),
    [System.Drawing.Point]::new(72, 86),
    [System.Drawing.Point]::new(24, 62)
)
DrawPoly $cushionLeft $colVelvetMain $colOutline $g

# Cushion Right-Front Face (in shadow)
$cushionRight = @(
    [System.Drawing.Point]::new(72, 76),
    [System.Drawing.Point]::new(120, 52),
    [System.Drawing.Point]::new(120, 62),
    [System.Drawing.Point]::new(72, 86)
)
DrawPoly $cushionRight $colVelvetMid $colOutline $g

# 5. Sculptural Asymmetric Armrests
# Left High Wave Armrest (sweeps forward along the left side, curving smoothly)
$armLeft = @(
    [System.Drawing.Point]::new(18, 44),
    [System.Drawing.Point]::new(24, 38),
    [System.Drawing.Point]::new(32, 42),
    [System.Drawing.Point]::new(36, 56),
    [System.Drawing.Point]::new(30, 68),
    [System.Drawing.Point]::new(22, 66),
    [System.Drawing.Point]::new(18, 56)
)
DrawPoly $armLeft $colVelvetMain $colOutline $g

# Left Arm Top Highlight
$armLeftTop = @(
    [System.Drawing.Point]::new(20, 44),
    [System.Drawing.Point]::new(24, 40),
    [System.Drawing.Point]::new(30, 44),
    [System.Drawing.Point]::new(26, 48)
)
DrawPoly $armLeftTop $colVelvetHighlight $colOutline $g

# Right Low Sleek Armrest (curved teardrop bolster)
$armRight = @(
    [System.Drawing.Point]::new(112, 46),
    [System.Drawing.Point]::new(122, 42),
    [System.Drawing.Point]::new(128, 48),
    [System.Drawing.Point]::new(126, 60),
    [System.Drawing.Point]::new(118, 64),
    [System.Drawing.Point]::new(112, 54)
)
DrawPoly $armRight $colVelvetMid $colOutline $g

# Right Arm Highlight
$armRightTop = @(
    [System.Drawing.Point]::new(114, 48),
    [System.Drawing.Point]::new(122, 44),
    [System.Drawing.Point]::new(126, 49),
    [System.Drawing.Point]::new(118, 53)
)
DrawPoly $armRightTop $colVelvetLight $colOutline $g

# 6. Brass Peg Legs (Front Left, Front Right)
# Front Left Leg
DrawPoly @([System.Drawing.Point]::new(32, 68), [System.Drawing.Point]::new(37, 70), [System.Drawing.Point]::new(37, 88), [System.Drawing.Point]::new(32, 86)) $colBrass $colOutline $g
# Front Right Leg
DrawPoly @([System.Drawing.Point]::new(110, 68), [System.Drawing.Point]::new(115, 70), [System.Drawing.Point]::new(115, 88), [System.Drawing.Point]::new(110, 86)) $colBrass $colOutline $g

# Tight crop
$minX = $w; $maxX = 0; $minY = $h; $maxY = 0
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        if ($bmp.GetPixel($x, $y).A -gt 10) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1
$finalBmp = $bmp.Clone((New-Object System.Drawing.Rectangle $minX, $minY, $cropW, $cropH), $bmp.PixelFormat)

$sofaPath = "$outDir\sofa_wave.png"
$finalBmp.Save($sofaPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$finalBmp.Dispose()
$g.Dispose()

Write-Host "Generated: $sofaPath ($cropW x $cropH)"
