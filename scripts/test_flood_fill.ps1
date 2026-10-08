Add-Type -AssemblyName System.Drawing

function Remove-WhiteBgFloodFill($srcBmp) {
    $w = $srcBmp.Width
    $h = $srcBmp.Height
    $res = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    # Copy pixels first
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $res.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
        }
    }
    
    # BFS flood fill from edges for near-white pixels (R>230, G>230, B>230)
    $visited = New-Object 'bool[,]' $w, $h
    $queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]
    
    # Seed top and bottom edges
    for ($x = 0; $x -lt $w; $x++) {
        $queue.Enqueue([System.Drawing.Point]::new($x, 0))
        $queue.Enqueue([System.Drawing.Point]::new($x, $h - 1))
        $visited[$x, 0] = $true
        $visited[$x, $h - 1] = $true
    }
    # Seed left and right edges
    for ($y = 0; $y -lt $h; $y++) {
        $queue.Enqueue([System.Drawing.Point]::new(0, $y))
        $queue.Enqueue([System.Drawing.Point]::new($w - 1, $y))
        $visited[0, $y] = $true
        $visited[$w - 1, $y] = $true
    }
    
    while ($queue.Count -gt 0) {
        $pt = $queue.Dequeue()
        $px = $pt.X; $py = $pt.Y
        $col = $srcBmp.GetPixel($px, $py)
        # Background condition: high brightness
        if ($col.R -gt 230 -and $col.G -gt 230 -and $col.B -gt 230) {
            $res.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            # Check 4 neighbors
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
    return $res
}

$raw = [System.Drawing.Bitmap]::FromFile("C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\blue_flower_chair_se_1791264869478.jpg")
$trans = Remove-WhiteBgFloodFill $raw
$raw.Dispose()

# Tight bbox
$w = $trans.Width; $h = $trans.Height
$minX = $w; $maxX = 0; $minY = $h; $maxY = 0
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        if ($trans.GetPixel($x, $y).A -gt 10) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1
$crop = $trans.Clone((New-Object System.Drawing.Rectangle $minX, $minY, $cropW, $cropH), $trans.PixelFormat)
$trans.Dispose()

# Scale to target width 60px
$targetW = 60
$targetH = [int]($cropH * ($targetW / $cropW))
$final = New-Object System.Drawing.Bitmap $targetW, $targetH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($final)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.DrawImage($crop, 0, 0, $targetW, $targetH)

$testOut = "client\public\assets\furniture\chairs\test_blue_flower_se.png"
if (-not (Test-Path "client\public\assets\furniture\chairs")) { New-Item -ItemType Directory -Path "client\public\assets\furniture\chairs" -Force | Out-Null }
$final.Save($testOut, [System.Drawing.Imaging.ImageFormat]::Png)
$crop.Dispose()
$final.Dispose()
$g.Dispose()

Write-Host "Processed test: $targetW x $targetH saved to $testOut"
