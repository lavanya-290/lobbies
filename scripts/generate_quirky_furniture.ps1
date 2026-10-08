Add-Type -AssemblyName System.Drawing

$outDir = "client\public\assets\furniture\quirky"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

# ==========================================
# 1. SOFA_WAVE (140 x 92)
# ==========================================
$w = 144
$h = 96
$sofa = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($sofa)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

$colOutline = [System.Drawing.ColorTranslator]::FromHtml("#1b1b2f")
$colDarkVelvet = [System.Drawing.ColorTranslator]::FromHtml("#6e1f04")
$colDeepOrange = [System.Drawing.ColorTranslator]::FromHtml("#9e3800")
$colOrange = [System.Drawing.ColorTranslator]::FromHtml("#d35400")
$colBrightOrange = [System.Drawing.ColorTranslator]::FromHtml("#e67e22")
$colHighlight = [System.Drawing.ColorTranslator]::FromHtml("#f39c12")
$colLightCushion = [System.Drawing.ColorTranslator]::FromHtml("#f8c471")
$colBrass = [System.Drawing.ColorTranslator]::FromHtml("#d4ac0d")
$colDarkBrass = [System.Drawing.ColorTranslator]::FromHtml("#9a7d0a")

function FillAndOutline($pts, $fillCol, $penCol, $graphics) {
    $brush = New-Object System.Drawing.SolidBrush $fillCol
    $pen = New-Object System.Drawing.Pen $penCol, 1
    $graphics.FillPolygon($brush, $pts)
    $graphics.DrawPolygon($pen, $pts)
    $brush.Dispose()
    $pen.Dispose()
}

# 1. Rear legs (tapered brass)
FillAndOutline @([System.Drawing.Point]::new(42, 60), [System.Drawing.Point]::new(48, 63), [System.Drawing.Point]::new(48, 75), [System.Drawing.Point]::new(42, 72)) $colDarkBrass $colOutline $g
FillAndOutline @([System.Drawing.Point]::new(118, 52), [System.Drawing.Point]::new(124, 55), [System.Drawing.Point]::new(124, 67), [System.Drawing.Point]::new(118, 64)) $colDarkBrass $colOutline $g

# 2. Wave Backrest (Solid back body)
# High wave peaks on left at Y=10, flows down gracefully to Y=36 on right
$waveBackOuter = @(
    [System.Drawing.Point]::new(16, 56),
    [System.Drawing.Point]::new(14, 38),
    [System.Drawing.Point]::new(20, 20),
    [System.Drawing.Point]::new(34, 10),
    [System.Drawing.Point]::new(52, 8),
    [System.Drawing.Point]::new(70, 14),
    [System.Drawing.Point]::new(90, 22),
    [System.Drawing.Point]::new(112, 28),
    [System.Drawing.Point]::new(128, 36),
    [System.Drawing.Point]::new(134, 48),
    [System.Drawing.Point]::new(124, 64),
    [System.Drawing.Point]::new(72, 70),
    [System.Drawing.Point]::new(24, 64)
)
FillAndOutline $waveBackOuter $colDeepOrange $colOutline $g

# Inner wave face (cushion shadow)
$waveInner = @(
    [System.Drawing.Point]::new(22, 54),
    [System.Drawing.Point]::new(20, 38),
    [System.Drawing.Point]::new(26, 24),
    [System.Drawing.Point]::new(38, 16),
    [System.Drawing.Point]::new(52, 14),
    [System.Drawing.Point]::new(70, 20),
    [System.Drawing.Point]::new(90, 28),
    [System.Drawing.Point]::new(112, 34),
    [System.Drawing.Point]::new(126, 42),
    [System.Drawing.Point]::new(120, 56),
    [System.Drawing.Point]::new(72, 60),
    [System.Drawing.Point]::new(28, 56)
)
FillAndOutline $waveInner $colOrange $colOutline $g

# Wave Top Crest Velvet Highlight
$waveCrest = @(
    [System.Drawing.Point]::new(20, 20),
    [System.Drawing.Point]::new(34, 10),
    [System.Drawing.Point]::new(52, 8),
    [System.Drawing.Point]::new(70, 14),
    [System.Drawing.Point]::new(90, 22),
    [System.Drawing.Point]::new(112, 28),
    [System.Drawing.Point]::new(128, 36),
    [System.Drawing.Point]::new(124, 40),
    [System.Drawing.Point]::new(110, 32),
    [System.Drawing.Point]::new(88, 25),
    [System.Drawing.Point]::new(68, 18),
    [System.Drawing.Point]::new(50, 12),
    [System.Drawing.Point]::new(34, 14),
    [System.Drawing.Point]::new(24, 22)
)
FillAndOutline $waveCrest $colHighlight $colOutline $g

# 3. Main Seat Cushion Block (Iso 2:1)
# Top Surface
$cushionTop = @(
    [System.Drawing.Point]::new(26, 52),
    [System.Drawing.Point]::new(72, 74),
    [System.Drawing.Point]::new(118, 52),
    [System.Drawing.Point]::new(72, 32)
)
FillAndOutline $cushionTop $colBrightOrange $colOutline $g

# Top Cushion Highlight Stripe
$cushionStripe = @(
    [System.Drawing.Point]::new(36, 50),
    [System.Drawing.Point]::new(72, 68),
    [System.Drawing.Point]::new(108, 50),
    [System.Drawing.Point]::new(72, 40)
)
FillAndOutline $cushionStripe $colLightCushion $colOutline $g

# Left-Front Cushion Face
$cushionLeftFace = @(
    [System.Drawing.Point]::new(26, 52),
    [System.Drawing.Point]::new(72, 74),
    [System.Drawing.Point]::new(72, 84),
    [System.Drawing.Point]::new(26, 62)
)
FillAndOutline $cushionLeftFace $colOrange $colOutline $g

# Right-Front Cushion Face
$cushionRightFace = @(
    [System.Drawing.Point]::new(72, 74),
    [System.Drawing.Point]::new(118, 52),
    [System.Drawing.Point]::new(118, 62),
    [System.Drawing.Point]::new(72, 84)
)
FillAndOutline $cushionRightFace $colDeepOrange $colOutline $g

# Undercarriage Plinth / Skirt
$skirtLeft = @(
    [System.Drawing.Point]::new(28, 62),
    [System.Drawing.Point]::new(72, 84),
    [System.Drawing.Point]::new(72, 88),
    [System.Drawing.Point]::new(28, 66)
)
FillAndOutline $skirtLeft $colDarkVelvet $colOutline $g

$skirtRight = @(
    [System.Drawing.Point]::new(72, 84),
    [System.Drawing.Point]::new(116, 62),
    [System.Drawing.Point]::new(116, 66),
    [System.Drawing.Point]::new(72, 88)
)
FillAndOutline $skirtRight $colDarkVelvet $colOutline $g

# 4. Sculptural Asymmetric Armrests
# Left High Arm (wraps corner)
$leftArm = @(
    [System.Drawing.Point]::new(16, 54),
    [System.Drawing.Point]::new(18, 42),
    [System.Drawing.Point]::new(28, 44),
    [System.Drawing.Point]::new(34, 58),
    [System.Drawing.Point]::new(24, 68),
    [System.Drawing.Point]::new(16, 62)
)
FillAndOutline $leftArm $colBrightOrange $colOutline $g

# Right Low Sculptural Arm
$rightArm = @(
    [System.Drawing.Point]::new(114, 50),
    [System.Drawing.Point]::new(126, 42),
    [System.Drawing.Point]::new(134, 50),
    [System.Drawing.Point]::new(126, 62),
    [System.Drawing.Point]::new(112, 58)
)
FillAndOutline $rightArm $colDeepOrange $colOutline $g

# 5. Front Brass Peg Legs
FillAndOutline @([System.Drawing.Point]::new(32, 66), [System.Drawing.Point]::new(37, 68), [System.Drawing.Point]::new(37, 86), [System.Drawing.Point]::new(32, 84)) $colBrass $colOutline $g
FillAndOutline @([System.Drawing.Point]::new(69, 86), [System.Drawing.Point]::new(74, 88), [System.Drawing.Point]::new(74, 94), [System.Drawing.Point]::new(69, 92)) $colBrass $colOutline $g
FillAndOutline @([System.Drawing.Point]::new(110, 65), [System.Drawing.Point]::new(115, 67), [System.Drawing.Point]::new(115, 84), [System.Drawing.Point]::new(110, 82)) $colBrass $colOutline $g

$sofaPath = "$outDir\sofa_wave.png"
$sofa.Save($sofaPath, [System.Drawing.Imaging.ImageFormat]::Png)
$sofa.Dispose()
$g.Dispose()
Write-Host "Updated: $sofaPath"
