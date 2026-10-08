Add-Type -AssemblyName System.Drawing

function Process-GeneratedSprite($rawPath, $outPath, $targetWidth) {
    if (-not (Test-Path $rawPath)) {
        Write-Error "File not found: $rawPath"
        return
    }

    $srcBmp = [System.Drawing.Bitmap]::FromFile($rawPath)
    $w = $srcBmp.Width
    $h = $srcBmp.Height

    $res = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $res.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
        }
    }

    $visited = New-Object 'bool[,]' $w, $h
    $queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]

    for ($x = 0; $x -lt $w; $x++) {
        $queue.Enqueue([System.Drawing.Point]::new($x, 0))
        $queue.Enqueue([System.Drawing.Point]::new($x, ($h - 1)))
        $visited[$x, 0] = $true
        $visited[$x, ($h - 1)] = $true
    }
    for ($y = 0; $y -lt $h; $y++) {
        $queue.Enqueue([System.Drawing.Point]::new(0, $y))
        $queue.Enqueue([System.Drawing.Point]::new(($w - 1), $y))
        $visited[0, $y] = $true
        $visited[($w - 1), $y] = $true
    }

    while ($queue.Count -gt 0) {
        $pt = $queue.Dequeue()
        $px = $pt.X; $py = $pt.Y
        $col = $srcBmp.GetPixel($px, $py)
        # Background threshold (solid pure or near-white)
        if ($col.R -gt 225 -and $col.G -gt 225 -and $col.B -gt 225) {
            $res.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            $dx = @(0, 0, 1, -1)
            $dy = @(1, -1, 0, 0)
            for ($i = 0; $i -lt 4; $i++) {
                $nx = $px + $dx[$i]
                $ny = $py + $dy[$i]
                if ($nx -ge 0 -and $nx -lt $w -and $ny -ge 0 -and $ny -lt $h) {
                    if (-not $visited[$nx, $ny]) {
                        $visited[$nx, $ny] = $true
                        $queue.Enqueue([System.Drawing.Point]::new($nx, $ny))
                    }
                }
            }
        }
    }
    $srcBmp.Dispose()

    # Find tight bounding box
    $minX = $w; $maxX = 0; $minY = $h; $maxY = 0
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            if ($res.GetPixel($x, $y).A -gt 15) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    if ($minX -ge $maxX -or $minY -ge $maxY) {
        Write-Error "Invalid bbox for $rawPath"
        $res.Dispose()
        return
    }

    $cropW = $maxX - $minX + 1
    $cropH = $maxY - $minY + 1
    $crop = $res.Clone((New-Object System.Drawing.Rectangle $minX, $minY, $cropW, $cropH), $res.PixelFormat)
    $res.Dispose()

    $targetH = [int][System.Math]::Round($cropH * ($targetWidth / $cropW))
    $final = New-Object System.Drawing.Bitmap $targetWidth, $targetH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($final)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g.DrawImage($crop, 0, 0, $targetWidth, $targetH)

    $parentDir = Split-Path -Parent $outPath
    if (-not (Test-Path $parentDir)) { New-Item -ItemType Directory -Path $parentDir -Force | Out-Null }

    $final.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $crop.Dispose()
    $final.Dispose()
    $g.Dispose()

    Write-Host "Processed -> $outPath ($targetWidth x $targetH)"
}

$brainDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe"

$items = @(
    @{ Raw = "sofa_se_1791352930633.jpg";                 Out = "client/public/assets/furniture/chairs/sofa_se.png";                 W = 112 },
    @{ Raw = "sofa_sw_1791352953468.jpg";                 Out = "client/public/assets/furniture/chairs/sofa_sw.png";                 W = 112 },
    @{ Raw = "yellow_pretty_chair_se_1791352976234.jpg"; Out = "client/public/assets/furniture/chairs/yellow_pretty_chair_se.png"; W = 62 },
    @{ Raw = "yellow_pretty_chair_sw_1791352996310.jpg"; Out = "client/public/assets/furniture/chairs/yellow_pretty_chair_sw.png"; W = 62 },
    @{ Raw = "flower_carpet_se_1791353018777.jpg";        Out = "client/public/assets/furniture/carpets/flower_carpet_se.png";        W = 96 },
    @{ Raw = "flower_carpet_sw_1791353042646.jpg";        Out = "client/public/assets/furniture/carpets/flower_carpet_sw.png";        W = 96 },
    @{ Raw = "pink_splash_rug_se_1791353067985.jpg";      Out = "client/public/assets/furniture/carpets/pink_splash_rug_se.png";      W = 104 },
    @{ Raw = "pink_splash_rug_sw_1791353091728.jpg";      Out = "client/public/assets/furniture/carpets/pink_splash_rug_sw.png";      W = 104 },
    @{ Raw = "simple_circle_rug_se_1791353133103.jpg";    Out = "client/public/assets/furniture/carpets/simple_circle_rug_se.png";    W = 88 },
    @{ Raw = "simple_circle_rug_sw_1791353156181.jpg";    Out = "client/public/assets/furniture/carpets/simple_circle_rug_sw.png";    W = 88 },
    @{ Raw = "simple_rug_se_1791353180616.jpg";           Out = "client/public/assets/furniture/carpets/simple_rug_se.png";           W = 100 },
    @{ Raw = "simple_rug_sw_1791353205420.jpg";           Out = "client/public/assets/furniture/carpets/simple_rug_sw.png";           W = 100 },
    @{ Raw = "tiger_carpet_se_1791353231350.jpg";         Out = "client/public/assets/furniture/carpets/tiger_carpet_se.png";         W = 110 }
)

foreach ($it in $items) {
    $rawPath = Join-Path $brainDir $it.Raw
    Process-GeneratedSprite $rawPath $it.Out $it.W
}
