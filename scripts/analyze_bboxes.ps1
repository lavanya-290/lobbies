Add-Type -AssemblyName System.Drawing

function Analyze-Frames($path, $numFrames, $name) {
    if (!(Test-Path $path)) { return }
    $bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path).Path)
    $fw = [int]($bmp.Width / $numFrames)
    $fh = $bmp.Height
    Write-Output "--- $name (Canvas: $($bmp.Width)x$fh, FrameWidth: $fw) ---"
    
    for ($f = 0; $f -lt $numFrames; $f++) {
        $startX = $f * $fw
        $minX = $fw; $maxX = 0; $minY = $fh; $maxY = 0; $hasPix = $false
        
        for ($y = 0; $y -lt $fh; $y++) {
            for ($x = 0; $x -lt $fw; $x++) {
                $c = $bmp.GetPixel($startX + $x, $y)
                if ($c.A -gt 20) {
                    $hasPix = $true
                    if ($x -lt $minX) { $minX = $x }
                    if ($x -gt $maxX) { $maxX = $x }
                    if ($y -lt $minY) { $minY = $y }
                    if ($y -gt $maxY) { $maxY = $y }
                }
            }
        }
        
        if ($hasPix) {
            $w = $maxX - $minX + 1
            $h = $maxY - $minY + 1
            $padBottom = $fh - 1 - $maxY
            Write-Output "  Frame $($f): Content=${w}x${h}, X=[$minX, $maxX], Y=[$minY, $maxY], DistFromBottom=$padBottom"
        } else {
            Write-Output "  Frame $($f): EMPTY"
        }
    }
    $bmp.Dispose()
}

Analyze-Frames 'client/public/assets/characters/female_idle.png' 1 'Female Idle'
Analyze-Frames 'client/public/assets/characters/female_walk_down.png' 4 'Female Walk Down'
Analyze-Frames 'client/public/assets/characters/female_walk_up.png' 4 'Female Walk Up'
Analyze-Frames 'client/public/assets/characters/female_walk_right.png' 4 'Female Walk Right'

Analyze-Frames 'client/public/assets/characters/male_idle.png' 1 'Male Idle'
Analyze-Frames 'client/public/assets/characters/male_walk_down.png' 4 'Male Walk Down'
Analyze-Frames 'client/public/assets/characters/male_walk_up.png' 4 'Male Walk Up'
Analyze-Frames 'client/public/assets/characters/male_walk_right.png' 4 'Male Walk Right'
