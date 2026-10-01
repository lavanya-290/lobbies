$csharpCode = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public class ImageLoader {
    public static Bitmap LoadWithTransparency(string path) {
        Bitmap res;
        using (Bitmap src = new Bitmap(path)) {
            res = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb);
            for (int y = 0; y < src.Height; y++) {
                for (int x = 0; x < src.Width; x++) {
                    res.SetPixel(x, y, src.GetPixel(x, y));
                }
            }
        }
        
        Color corner = res.GetPixel(0, 0);
        if (corner.A > 200 && corner.R > 230 && corner.G > 230 && corner.B > 230) {
            int w = res.Width, h = res.Height;
            bool[,] visited = new bool[w, h];
            Queue<Point> q = new Queue<Point>();
            int tol = 30;
            Action<int, int> tryEnq = (x, y) => {
                if (x >= 0 && x < w && y >= 0 && y < h && !visited[x, y]) {
                    Color c = res.GetPixel(x, y);
                    if (c.R >= (255 - tol) && c.G >= (255 - tol) && c.B >= (255 - tol)) {
                        visited[x, y] = true;
                        q.Enqueue(new Point(x, y));
                    }
                }
            };
            for (int x = 0; x < w; x++) { tryEnq(x, 0); tryEnq(x, h - 1); }
            for (int y = 0; y < h; y++) { tryEnq(0, y); tryEnq(w - 1, y); }
            while (q.Count > 0) {
                Point p = q.Dequeue();
                res.SetPixel(p.X, p.Y, Color.FromArgb(0, 0, 0, 0));
                int[] dx = { 1, -1, 0, 0 };
                int[] dy = { 0, 0, 1, -1 };
                for (int i = 0; i < 4; i++) tryEnq(p.X + dx[i], p.Y + dy[i]);
            }
        }
        return res;
    }
}
'@

if (-not ([System.Management.Automation.PSTypeName]'ImageLoader').Type) {
    Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing
}

# 1. STANDARDIZE ALL CHARACTER SPRITESHEETS TO 321x767
$baseDir = 'client/public/assets/characters'
$sharedFrameW = 321
$sharedFrameH = 767
$groundY = $sharedFrameH - 4 # Y = 763 (bottom pixel at 762)

Write-Output "=== Standardizing Character Sprite Sheets to ${sharedFrameW}x${sharedFrameH} ==="

function Get-TightBBox($bmp, $startX, $startY, $width, $height) {
    $minX = $width; $maxX = 0; $minY = $height; $maxY = 0; $has = $false
    for ($y = $startY; $y -lt ($startY + $height); $y++) {
        for ($x = $startX; $x -lt ($startX + $width); $x++) {
            if ($bmp.GetPixel($x, $y).A -gt 20) {
                $has = $true
                $lx = $x - $startX
                if ($lx -lt $minX) { $minX = $lx }
                if ($lx -gt $maxX) { $maxX = $lx }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($has) {
        return [PSCustomObject]@{
            X = $startX + $minX; Y = $minY
            W = ($maxX - $minX + 1); H = ($maxY - $minY + 1)
        }
    }
    return $null
}

function Crop-Image($bmp, $rect) {
    $c = New-Object System.Drawing.Bitmap $rect.W, $rect.H, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($c)
    $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, $rect.W, $rect.H), (New-Object System.Drawing.Rectangle $rect.X, $rect.Y, $rect.W, $rect.H), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    return $c
}

$genders = @('female', 'male')
foreach ($gender in $genders) {
    # Idle
    $rawIdlePath = Join-Path $baseDir "chibi_${gender}_idle.png"
    $rawIdle = [ImageLoader]::LoadWithTransparency((Resolve-Path $rawIdlePath).Path)
    $idleBox = Get-TightBBox $rawIdle 0 0 $rawIdle.Width $rawIdle.Height
    $tightIdle = Crop-Image $rawIdle $idleBox
    $rawIdle.Dispose()
    
    $idleCanvas = New-Object System.Drawing.Bitmap $sharedFrameW, $sharedFrameH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($idleCanvas)
    $destX = [int](($sharedFrameW - $tightIdle.Width) / 2)
    $destY = $groundY - $tightIdle.Height
    $g.DrawImage($tightIdle, $destX, $destY)
    $g.Dispose()
    $tightIdle.Dispose()
    
    $outIdle = Join-Path $baseDir "${gender}_idle.png"
    $idleCanvas.Save($outIdle, [System.Drawing.Imaging.ImageFormat]::Png)
    $idleCanvas.Dispose()
    Write-Output "Saved $outIdle (Dimensions: ${sharedFrameW}x${sharedFrameH})"
    
    # Walks
    foreach ($dir in @('walk_down', 'walk_up', 'walk_right')) {
        $rawWalkPath = Join-Path $baseDir "chibi_${gender}_${dir}.png"
        $rawWalk = [ImageLoader]::LoadWithTransparency((Resolve-Path $rawWalkPath).Path)
        $fw = [int]($rawWalk.Width / 4)
        
        $stripW = 4 * $sharedFrameW
        $stripH = $sharedFrameH
        $stripBmp = New-Object System.Drawing.Bitmap $stripW, $stripH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $gStrip = [System.Drawing.Graphics]::FromImage($stripBmp)
        
        for ($i = 0; $i -lt 4; $i++) {
            $box = Get-TightBBox $rawWalk ($i * $fw) 0 $fw $rawWalk.Height
            $tight = Crop-Image $rawWalk $box
            $frameDestX = ($i * $sharedFrameW) + [int](($sharedFrameW - $tight.Width) / 2)
            $frameDestY = $groundY - $tight.Height
            $gStrip.DrawImage($tight, $frameDestX, $frameDestY)
            $tight.Dispose()
        }
        $gStrip.Dispose()
        $rawWalk.Dispose()
        
        $outWalk = Join-Path $baseDir "${gender}_${dir}.png"
        $stripBmp.Save($outWalk, [System.Drawing.Imaging.ImageFormat]::Png)
        $stripBmp.Dispose()
        Write-Output "Saved $outWalk (Dimensions: ${stripW}x${stripH}, 4 frames of ${sharedFrameW}x${sharedFrameH})"
    }
}

Write-Output ""
Write-Output "=== Standardizing All Outfits to ${sharedFrameW}x${sharedFrameH} Canvases ==="

# 2. STANDARDIZE ALL OUTFIT CANVASES TO 321x767
$categorySpecs = @{
    'henley_shirt'      = @{ TargetW = 246; TargetH = 200; CenterX = 160; TopY = 324 }
    'crop_top'          = @{ TargetW = 230; TargetH = 180; CenterX = 160; TopY = 324 }
    'jeans_regular'     = @{ TargetW = 180; TargetH = 240; CenterX = 160; TopY = 515 }
    'culottes'          = @{ TargetW = 200; TargetH = 170; CenterX = 160; TopY = 515 }
    'conical_hat'       = @{ TargetW = 290; TargetH = 180; CenterX = 160; TopY = 4 }
    'tricorn_hat'       = @{ TargetW = 280; TargetH = 175; CenterX = 160; TopY = 20 }
    'geta_sandals'      = @{ TargetW = 175; TargetH = 100; CenterX = 160; BottomY = 762 }
    'hakama_pants'      = @{ TargetW = 190; TargetH = 240; CenterX = 160; TopY = 515 }
    'kimono_casual'     = @{ TargetW = 250; TargetH = 440; CenterX = 160; TopY = 320 }
    'yukata_summer'     = @{ TargetW = 250; TargetH = 400; CenterX = 160; TopY = 320 }
    'captains_coat'     = @{ TargetW = 260; TargetH = 400; CenterX = 160; TopY = 320 }
    'sash_and_boots'    = @{ TargetW = 185; TargetH = 250; CenterX = 160; BottomY = 762 }
    'eyepatch_accessory'= @{ TargetW = 170; TargetH = 130; CenterX = 160; TopY = 170 }
}

$outfitFiles = Get-ChildItem -Recurse -File client/public/assets/outfits
foreach ($f in $outfitFiles) {
    $baseName = $f.BaseName.Replace('_idle', '')
    if ($categorySpecs.ContainsKey($baseName)) {
        $spec = $categorySpecs[$baseName]
        $rawBmp = [System.Drawing.Bitmap]::FromFile($f.FullName)
        $box = Get-TightBBox $rawBmp 0 0 $rawBmp.Width $rawBmp.Height
        $tight = Crop-Image $rawBmp $box
        $rawBmp.Dispose()
        
        $scaleX = $spec.TargetW / $tight.Width
        $scaleY = if ($spec.ContainsKey('TargetH')) { $spec.TargetH / $tight.Height } else { $scaleX }
        $scale = [Math]::Min($scaleX, $scaleY)
        
        $drawW = [int]($tight.Width * $scale)
        $drawH = [int]($tight.Height * $scale)
        $destX = $spec.CenterX - [int]($drawW / 2)
        $destY = if ($spec.ContainsKey('BottomY')) { $spec.BottomY - $drawH } else { $spec.TopY }
        
        $standardCanvas = New-Object System.Drawing.Bitmap $sharedFrameW, $sharedFrameH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($standardCanvas)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        
        $g.DrawImage($tight, (New-Object System.Drawing.Rectangle $destX, $destY, $drawW, $drawH), 0, 0, $tight.Width, $tight.Height, [System.Drawing.GraphicsUnit]::Pixel)
        $g.Dispose()
        $tight.Dispose()
        
        $standardCanvas.Save($f.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
        $standardCanvas.Dispose()
        Write-Output "Standardized $($f.Name) -> Canvas: ${sharedFrameW}x${sharedFrameH}, Content at ($destX, $destY) size (${drawW}x${drawH})"
    }
}
