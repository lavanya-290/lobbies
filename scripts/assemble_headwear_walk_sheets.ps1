Add-Type -AssemblyName System.Drawing

function Get-TightBBox($bmp) {
    $minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.A -gt 15) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($minX -gt $maxX) { return New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height }
    return New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1)
}

function Build-HeadwearWalkSheet {
    param (
        [string]$idleAssetPath,
        [string]$outputDir,
        [string]$itemBaseName,
        [int]$baseTopYOffset = -15, # offset from head top
        [string]$gender = "female"
    )

    $charFramesDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters\frames"
    $idleBmp = [System.Drawing.Bitmap]::FromFile($idleAssetPath)
    $box = Get-TightBBox $idleBmp
    $tight = $idleBmp.Clone($box, $idleBmp.PixelFormat)
    $idleBmp.Dispose()

    $dirs = @("walk_down", "walk_up", "walk_right")

    foreach ($d in $dirs) {
        $sheet = New-Object System.Drawing.Bitmap 1284, 767, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($sheet)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

        for ($i = 0; $i -lt 4; $i++) {
            # Find top of head in base char frame
            $frameFile = Join-Path $charFramesDir "${gender}_${d}_frame${i}.png"
            $charBmp = [System.Drawing.Bitmap]::FromFile($frameFile)
            $charBox = Get-TightBBox $charBmp
            $headTopY = $charBox.Y
            $headCenterX = $charBox.X + [int]($charBox.Width / 2)
            $charBmp.Dispose()

            $destX = ($i * 321) + $headCenterX - [int]($tight.Width / 2)
            $destY = $headTopY + $baseTopYOffset

            $g.DrawImage($tight, $destX, $destY, $tight.Width, $tight.Height)
        }
        $g.Dispose()

        $outPath = Join-Path $outputDir "${itemBaseName}_${d}.png"
        $sheet.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $sheet.Dispose()
        Write-Host "Created: $outPath"
    }
    $tight.Dispose()
}

$outfitsDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\outfits"

Build-HeadwearWalkSheet -idleAssetPath "$outfitsDir\japanese\conical_hat_idle.png" `
    -outputDir "$outfitsDir\japanese" -itemBaseName "conical_hat" -baseTopYOffset -20 -gender "female"

Build-HeadwearWalkSheet -idleAssetPath "$outfitsDir\pirate\tricorn_hat_idle.png" `
    -outputDir "$outfitsDir\pirate" -itemBaseName "tricorn_hat" -baseTopYOffset -15 -gender "male"

Build-HeadwearWalkSheet -idleAssetPath "$outfitsDir\pirate\eyepatch_accessory_idle.png" `
    -outputDir "$outfitsDir\pirate" -itemBaseName "eyepatch_accessory" -baseTopYOffset 85 -gender "male"
