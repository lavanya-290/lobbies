Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path 'client/public/assets/characters/female_idle.png').Path)
Write-Output "Image size: $($bmp.Width) x $($bmp.Height)"

for ($y = 10; $y -lt 300; $y += 20) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.A -gt 200 -and $c.R -lt 40 -and $c.G -lt 40 -and $c.B -lt 60) {
            $run = 0
            while (($x + $run) -lt $bmp.Width) {
                $c2 = $bmp.GetPixel($x + $run, $y)
                if ($c2.A -gt 200 -and $c2.R -lt 40 -and $c2.G -lt 40 -and $c2.B -lt 60) {
                    $run++
                } else {
                    break
                }
            }
            if ($run -ge 5 -and $run -le 35) {
                Write-Output ("At Y={0}, X={1}: Outline run length = {2}" -f $y, $x, $run)
            }
            break
        }
    }
}
$bmp.Dispose()
