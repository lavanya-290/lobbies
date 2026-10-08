Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('client\public\assets\outfits\japanese\hakama_pants_walk_down.png')
for ($f=0; $f -lt 4; $f++) {
    $minX=321; $maxX=0; $minY=767; $maxY=0
    for ($y=0; $y -lt 767; $y++) {
        for ($x=0; $x -lt 321; $x++) {
            $p = $bmp.GetPixel($f*321 + $x, $y)
            if ($p.A -gt 25) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    Write-Host ('Frame {0}: X=[{1}..{2}] Y=[{3}..{4}] W={5} H={6}' -f $f, $minX, $maxX, $minY, $maxY, ($maxX-$minX+1), ($maxY-$minY+1))
}
$bmp.Dispose()
