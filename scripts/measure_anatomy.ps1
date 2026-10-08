Add-Type -AssemblyName System.Drawing

$charactersDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters"

function Analyze-Anatomy($filePath, $label, $frameIndex = 0) {
    $bmp = [System.Drawing.Bitmap]::FromFile($filePath)
    $frameW = 321
    $frameH = 767
    $startX = $frameIndex * $frameW

    # Bounding box of this frame
    $minX = $frameW; $minY = $frameH; $maxX = 0; $maxY = 0
    for ($y = 0; $y -lt $frameH; $y++) {
        for ($x = 0; $x -lt $frameW; $x++) {
            $p = $bmp.GetPixel($startX + $x, $y)
            if ($p.A -gt 20) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    Write-Host "=== $label (Frame $frameIndex) ==="
    Write-Host "Total bounds: X=$minX..$maxX (W=$($maxX - $minX + 1)), Y=$minY..$maxY (H=$($maxY - $minY + 1))"

    # Analyze width at each row to locate head, chin/neck, shoulders, waist, crotch, ankles, feet
    $rowStats = @()
    for ($y = $minY; $y -le $maxY; $y++) {
        $rx1 = $frameW; $rx2 = 0
        for ($x = 0; $x -lt $frameW; $x++) {
            $p = $bmp.GetPixel($startX + $x, $y)
            if ($p.A -gt 20) {
                if ($x -lt $rx1) { $rx1 = $x }
                if ($x -gt $rx2) { $rx2 = $x }
            }
        }
        $rw = if ($rx2 -ge $rx1) { $rx2 - $rx1 + 1 } else { 0 }
        $rowStats += [PSCustomObject]@{ Y = $y; Width = $rw; Left = $rx1; Right = $rx2 }
    }

    # Head top to bottom
    # Look for neck pinch (minimum width around Y=250..350)
    $neckRow = ($rowStats | Where-Object { $_.Y -ge 240 -and $_.Y -le 350 } | Sort-Object Width | Select-Object -First 1)
    # Shoulders max width (around Y=300..450)
    $shoulderRow = ($rowStats | Where-Object { $_.Y -ge ($neckRow.Y) -and $_.Y -le 460 } | Sort-Object Width -Descending | Select-Object -First 1)
    # Waist pinch (around Y=450..550)
    $waistRow = ($rowStats | Where-Object { $_.Y -ge ($shoulderRow.Y) -and $_.Y -le 560 } | Sort-Object Width | Select-Object -First 1)
    # Hip max width (around Y=500..600)
    $hipRow = ($rowStats | Where-Object { $_.Y -ge ($waistRow.Y) -and $_.Y -le 620 } | Sort-Object Width -Descending | Select-Object -First 1)
    # Ankles (narrowest before feet around Y=660..730)
    $ankleRow = ($rowStats | Where-Object { $_.Y -ge 660 -and $_.Y -le 740 } | Sort-Object Width | Select-Object -First 1)

    Write-Host "Landmarks:"
    Write-Host "  Head Top: Y=$minY"
    Write-Host "  Neck/Chin: Y=$($neckRow.Y) (Width=$($neckRow.Width))"
    Write-Host "  Shoulders: Y=$($shoulderRow.Y) (Width=$($shoulderRow.Width))"
    Write-Host "  Waist: Y=$($waistRow.Y) (Width=$($waistRow.Width))"
    Write-Host "  Hips: Y=$($hipRow.Y) (Width=$($hipRow.Width))"
    Write-Host "  Ankles: Y=$($ankleRow.Y) (Width=$($ankleRow.Width))"
    Write-Host "  Feet Bottom: Y=$maxY"

    $bmp.Dispose()
}

Analyze-Anatomy "$charactersDir\base_female_idle.png" "Base Female Idle"
Analyze-Anatomy "$charactersDir\base_female_walk_down.png" "Base Female Walk Down" 0
Analyze-Anatomy "$charactersDir\base_female_walk_up.png" "Base Female Walk Up" 0
Analyze-Anatomy "$charactersDir\base_female_walk_right.png" "Base Female Walk Right" 0

Write-Host ""
Analyze-Anatomy "$charactersDir\base_male_idle.png" "Base Male Idle"
Analyze-Anatomy "$charactersDir\base_male_walk_down.png" "Base Male Walk Down" 0
Analyze-Anatomy "$charactersDir\base_male_walk_up.png" "Base Male Walk Up" 0
Analyze-Anatomy "$charactersDir\base_male_walk_right.png" "Base Male Walk Right" 0
