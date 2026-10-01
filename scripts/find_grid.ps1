Add-Type -AssemblyName System.Drawing

$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path 'client/public/assets/characters/female_idle.png').Path)

# Check unique X coordinates of transitions (where pixel changes color along a row)
$xTransitions = @{}
for ($y = 10; $y -lt $bmp.Height; $y += 5) {
    for ($x = 1; $x -lt $bmp.Width; $x++) {
        $c1 = $bmp.GetPixel($x - 1, $y)
        $c2 = $bmp.GetPixel($x, $y)
        if ($c1.ToArgb() -ne $c2.ToArgb()) {
            $xTransitions[$x] = [int]$xTransitions[$x] + 1
        }
    }
}

Write-Output "Most frequent X transition boundaries:"
$xTransitions.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 25 | Sort-Object { [int]$_.Name } | Format-Table -AutoSize
$bmp.Dispose()
