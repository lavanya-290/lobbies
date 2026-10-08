Add-Type -AssemblyName System.Drawing

function ScanAnatomy($path, $name) {
    $bmp = [System.Drawing.Bitmap]::FromFile($path)
    Write-Host "=== $name (Width: $($bmp.Width), Height: $($bmp.Height)) ==="
    
    # Scan horizontal slice widths to detect head, neck, shoulders, waist, legs
    for ($y = 0; $y -lt $bmp.Height; $y += 10) {
        $minX = $bmp.Width; $maxX = 0; $count = 0
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.A -gt 25) {
                $count++
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
            }
        }
        if ($count -gt 0) {
            $w = $maxX - $minX + 1
            $cx = [int](($minX + $maxX) / 2)
            Write-Host ("Y={0:D3}: Count={1:D3}, Width={2:D3}, X=[{3:D3}..{4:D3}], Center={5:D3}" -f $y, $count, $w, $minX, $maxX, $cx)
        }
    }
    $bmp.Dispose()
}

ScanAnatomy "client\public\assets\characters\base_female_idle.png" "Base Female Idle"
ScanAnatomy "client\public\assets\characters\base_male_idle.png" "Base Male Idle"
