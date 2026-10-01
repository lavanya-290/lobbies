Add-Type -AssemblyName System.Drawing
$filePath = Resolve-Path 'client/public/assets/tiles/SBS - Isometric Floor Tiles - Small 128x64/Small 128x64/Interior/Wood/Floor_Wood_01-128x64.png'
$bmp = [System.Drawing.Bitmap]::FromFile($filePath)
$pixels = @{}
$edgePixels = @{}

for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.A -gt 128) {
            $hex = '#{0:x2}{1:x2}{2:x2}' -f $c.R, $c.G, $c.B
            $pixels[$hex] = [int]$pixels[$hex] + 1
            
            # Check if it's on the border (neighbor has alpha < 128 or at boundary)
            $isEdge = $false
            if ($x -eq 0 -or $x -eq ($bmp.Width - 1) -or $y -eq 0 -or $y -eq ($bmp.Height - 1)) {
                $isEdge = $true
            } else {
                if ($bmp.GetPixel($x-1, $y).A -le 128 -or $bmp.GetPixel($x+1, $y).A -le 128 -or
                    $bmp.GetPixel($x, $y-1).A -le 128 -or $bmp.GetPixel($x, $y+1).A -le 128) {
                    $isEdge = $true
                }
            }
            if ($isEdge) {
                $edgePixels[$hex] = [int]$edgePixels[$hex] + 1
            }
        }
    }
}
$bmp.Dispose()

Write-Output "--- DOMINANT TILE COLORS ---"
$pixels.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5 | Format-Table -AutoSize

Write-Output "--- OUTLINE / EDGE COLORS ---"
$edgePixels.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5 | Format-Table -AutoSize
