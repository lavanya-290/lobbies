Add-Type -AssemblyName System.Drawing
$bmpF = [System.Drawing.Bitmap]::FromFile((Resolve-Path 'client/public/assets/characters/female_idle.png').Path)
$bmpM = [System.Drawing.Bitmap]::FromFile((Resolve-Path 'client/public/assets/characters/male_idle.png').Path)

# Check eye position in both
Write-Output "--- Eye / Face Features in Female Idle ---"
for ($y = 150; $y -lt 250; $y += 5) {
    for ($x = 70; $x -lt 200; $x += 5) {
        $c = $bmpF.GetPixel($x, $y)
        # Eye pixel is dark
        if ($c.A -gt 200 -and $c.R -lt 50 -and $c.G -lt 50 -and $c.B -lt 60) {
            Write-Output ("Female eye/feature pixel at X={0}, Y={1} (RGB: {2},{3},{4})" -f $x, $y, $c.R, $c.G, $c.B)
        }
    }
}

Write-Output "--- Eye / Face Features in Male Idle ---"
for ($y = 150; $y -lt 250; $y += 5) {
    for ($x = 70; $x -lt 200; $x += 5) {
        $c = $bmpM.GetPixel($x, $y)
        if ($c.A -gt 200 -and $c.R -lt 50 -and $c.G -lt 50 -and $c.B -lt 60) {
            Write-Output ("Male eye/feature pixel at X={0}, Y={1} (RGB: {2},{3},{4})" -f $x, $y, $c.R, $c.G, $c.B)
        }
    }
}
$bmpF.Dispose(); $bmpM.Dispose()
