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
        if ($col.R -gt 230 -and $col.G -gt 230 -and $col.B -gt 230) {
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

$items = @(
    @{ Raw = "blue_flower_chair_se_1791264869478.jpg"; Out = "client/public/assets/furniture/chairs/blue_flower_chair_se.png"; W = 60 },
    @{ Raw = "blue_flower_chair_sw_1791264892881.jpg"; Out = "client/public/assets/furniture/chairs/blue_flower_chair_sw.png"; W = 60 },
    @{ Raw = "blue_leaf_chair_se_1791264913865.jpg";   Out = "client/public/assets/furniture/chairs/blue_leaf_chair_se.png";   W = 62 },
    @{ Raw = "blue_leaf_chair_sw_1791264933622.jpg";   Out = "client/public/assets/furniture/chairs/blue_leaf_chair_sw.png";   W = 62 },
    @{ Raw = "heart_sofa_se_1791264957330.jpg";        Out = "client/public/assets/furniture/chairs/heart_sofa_se.png";        W = 110 },
    @{ Raw = "heart_sofa_sw_1791264979206.jpg";        Out = "client/public/assets/furniture/chairs/heart_sofa_sw.png";        W = 110 },
    @{ Raw = "orange_hanging_seating_se_1791265002376.jpg"; Out = "client/public/assets/furniture/chairs/orange_hanging_seating_se.png"; W = 112 },
    @{ Raw = "orange_hanging_seating_sw_1791265023818.jpg"; Out = "client/public/assets/furniture/chairs/orange_hanging_seating_sw.png"; W = 112 },
    @{ Raw = "red_armchair_se_1791265059840.jpg";       Out = "client/public/assets/furniture/chairs/red_armchair_se.png";       W = 62 },
    @{ Raw = "red_armchair_sw_1791265082002.jpg";       Out = "client/public/assets/furniture/chairs/red_armchair_sw.png";       W = 62 },
    @{ Raw = "scorpion_chair_se_1791265103313.jpg";     Out = "client/public/assets/furniture/chairs/scorpion_chair_se.png";     W = 66 },
    @{ Raw = "scorpion_chair_sw_1791265123341.jpg";     Out = "client/public/assets/furniture/chairs/scorpion_chair_sw.png";     W = 66 }
)

$brainDir = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe"

foreach ($it in $items) {
    $rawPath = Join-Path $brainDir $it.Raw
    Process-GeneratedSprite $rawPath $it.Out $it.W
}
