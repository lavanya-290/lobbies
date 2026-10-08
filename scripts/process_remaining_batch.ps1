# Script: scripts/process_remaining_batch.ps1
# Automates post-processing, transparent conversion, and nearest-neighbor scaling
# for the remaining 7 sprites once generated at quota reset (11:01:59 UTC).

Add-Type -AssemblyName System.Drawing

function Process-Sprite($rawPath, $outPath, $targetWidth) {
    if (-not (Test-Path $rawPath)) {
        Write-Warning "File not found yet: $rawPath (awaiting generation)"
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

# Items to process once generated
$items = @(
    @{ Pattern = "tiger_carpet_sw_*.jpg";          Out = "client/public/assets/furniture/carpets/tiger_carpet_sw.png";             W = 110 },
    @{ Pattern = "green_cupboard_quirky_se_*.jpg"; Out = "client/public/assets/furniture/quirky/green_cupboard_quirky_se.png";    W = 60 },
    @{ Pattern = "green_cupboard_quirky_sw_*.jpg"; Out = "client/public/assets/furniture/quirky/green_cupboard_quirky_sw.png";    W = 60 },
    @{ Pattern = "flowering_delicate_stem_*.jpg";  Out = "client/public/assets/furniture/houseplants/flowering_delicate_stem.png"; W = 44 },
    @{ Pattern = "desert_cacti_cluster_*.jpg";     Out = "client/public/assets/furniture/houseplants/desert_cacti_cluster.png";    W = 48 },
    @{ Pattern = "monstera_longleaf_*.jpg";        Out = "client/public/assets/furniture/houseplants/monstera_longleaf.png";       W = 54 },
    @{ Pattern = "pothos_money_plant_*.jpg";       Out = "client/public/assets/furniture/houseplants/pothos_money_plant.png";      W = 50 }
)

foreach ($it in $items) {
    $matches = Get-ChildItem -Path $brainDir -Filter $it.Pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($matches.Count -gt 0) {
        Process-Sprite $matches[0].FullName $it.Out $it.W
    } else {
        Write-Host "Waiting for generation: $($it.Pattern)"
    }
}
