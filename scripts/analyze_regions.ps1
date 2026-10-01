Add-Type -AssemblyName System.Drawing

function Analyze-ColorsByRegion($path, $label) {
    $bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path).Path)
    Write-Output "=== $label ==="
    
    # 1. Head (Y=4 to 280)
    $headColors = @{}
    # 2. Torso (Y=280 to 515)
    $torsoColors = @{}
    # 3. Legs (Y=515 to 680)
    $legColors = @{}
    # 4. Feet (Y=680 to 763)
    $feetColors = @{}

    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $c = $bmp.GetPixel($x, $y)
            if ($c.A -gt 100) {
                $hex = '#{0:x2}{1:x2}{2:x2}' -f $c.R, $c.G, $c.B
                if ($y -lt 280) { $headColors[$hex] = [int]$headColors[$hex] + 1 }
                elseif ($y -lt 515) { $torsoColors[$hex] = [int]$torsoColors[$hex] + 1 }
                elseif ($y -lt 680) { $legColors[$hex] = [int]$legColors[$hex] + 1 }
                else { $feetColors[$hex] = [int]$feetColors[$hex] + 1 }
            }
        }
    }
    $bmp.Dispose()

    Write-Output "--- Head Top Colors ---"
    $headColors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5 | Format-Table -AutoSize
    Write-Output "--- Torso Top Colors ---"
    $torsoColors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5 | Format-Table -AutoSize
    Write-Output "--- Leg Top Colors ---"
    $legColors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5 | Format-Table -AutoSize
    Write-Output "--- Feet Top Colors ---"
    $feetColors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5 | Format-Table -AutoSize
}

Analyze-ColorsByRegion 'client/public/assets/characters/female_idle.png' 'Female Idle'
Analyze-ColorsByRegion 'client/public/assets/characters/male_idle.png' 'Male Idle'
