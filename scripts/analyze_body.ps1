Add-Type -AssemblyName System.Drawing

function Analyze-BodySegments($path, $gender) {
    $bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path).Path)
    Write-Output "=== Analyzing $gender Base ==="
    
    # Track width per row
    $rowWidths = @()
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $minX = $bmp.Width; $maxX = 0; $has = $false
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            if ($bmp.GetPixel($x, $y).A -gt 20) {
                $has = $true
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
            }
        }
        if ($has) {
            $rowWidths += [PSCustomObject]@{ Y = $y; Width = ($maxX - $minX + 1); MinX = $minX; MaxX = $maxX }
        }
    }
    
    $topY = $rowWidths[0].Y
    $bottomY = $rowWidths[-1].Y
    Write-Output "Total character Y range: $topY to $bottomY (Height: $($bottomY - $topY + 1))"
    
    # Print width at intervals
    for ($y = $topY; $y -le $bottomY; $y += 40) {
        $row = $rowWidths | Where-Object { $_.Y -eq $y }
        if ($row) {
            Write-Output "  Y=$($y): Width=$($row.Width), X=[$($row.MinX), $($row.MaxX)]"
        }
    }
    $bmp.Dispose()
}

Analyze-BodySegments 'client/public/assets/characters/female_idle.png' 'Female'
Analyze-BodySegments 'client/public/assets/characters/male_idle.png' 'Male'
