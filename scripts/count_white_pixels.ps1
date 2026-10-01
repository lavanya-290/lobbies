Add-Type -AssemblyName System.Drawing

function Check-OpaqueBkg($path, $name) {
    $b = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path).Path)
    $nearWhiteCount = 0
    $transparentCount = 0
    $otherCount = 0
    for ($y = 0; $y -lt $b.Height; $y++) {
        for ($x = 0; $x -lt $b.Width; $x++) {
            $c = $b.GetPixel($x, $y)
            if ($c.A -eq 0) {
                $transparentCount++
            } elseif ($c.R -ge 240 -and $c.G -ge 240 -and $c.B -ge 240) {
                $nearWhiteCount++
            } else {
                $otherCount++
            }
        }
    }
    Write-Output "$name (Total: $($b.Width * $b.Height)):"
    Write-Output "  Transparent (A=0): $transparentCount"
    Write-Output "  Near White (A>0, RGB>=240): $nearWhiteCount"
    Write-Output "  Character Opaque Colors: $otherCount"
    $b.Dispose()
}

Write-Output "=== CHECKING IDLE SHEETS ==="
Check-OpaqueBkg 'client/public/assets/characters/female_idle.png' 'Female Idle'
Check-OpaqueBkg 'client/public/assets/characters/male_idle.png' 'Male Idle'
