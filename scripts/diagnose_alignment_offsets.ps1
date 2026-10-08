Add-Type -AssemblyName System.Drawing

$charactersDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters"
$outfitsDir = "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\outfits"

function Get-TightBBox($bmp, $startX = 0, $startY = 0, $w = -1, $h = -1) {
    if ($w -le 0) { $w = $bmp.Width }
    if ($h -le 0) { $h = $bmp.Height }
    $minX = $w; $minY = $h; $maxX = 0; $maxY = 0
    $hasPixels = $false
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $p = $bmp.GetPixel($startX + $x, $startY + $y)
            if ($p.A -gt 20) {
                $hasPixels = $true
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if (-not $hasPixels) { return $null }
    return [PSCustomObject]@{
        X = $minX
        Y = $minY
        Width = ($maxX - $minX + 1)
        Height = ($maxY - $minY + 1)
        Right = $maxX
        Bottom = $maxY
    }
}

function Analyze-Character($filePath, $label) {
    $bmp = [System.Drawing.Bitmap]::FromFile($filePath)
    $overall = Get-TightBBox $bmp
    Write-Host "=== $label ($($bmp.Width)x$($bmp.Height)) ==="
    Write-Host "Overall: X=$($overall.X), Y=$($overall.Y), W=$($overall.Width), H=$($overall.Height), Bottom=$($overall.Bottom)"

    # Let's inspect pixel horizontal profile to determine neck, waist, ankles
    # For each row, count width of non-alpha pixels
    $rowWidths = @()
    for ($y = $overall.Y; $y -le $overall.Bottom; $y++) {
        $minX = $bmp.Width; $maxX = 0
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            if ($bmp.GetPixel($x, $y).A -gt 20) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
            }
        }
        $w = if ($maxX -ge $minX) { $maxX - $minX + 1 } else { 0 }
        $rowWidths += [PSCustomObject]@{ Y = $y; Width = $w; MinX = $minX; MaxX = $maxX }
    }

    # Head is typically from top to where neck narrows before shoulders expand
    # Let's find landmarks
    $bmp.Dispose()
    return $overall
}

Write-Host "--- BASE IDLE CHARACTERS ---"
$femaleIdle = Analyze-Character "$charactersDir\base_female_idle.png" "Base Female Idle"
$maleIdle = Analyze-Character "$charactersDir\base_male_idle.png" "Base Male Idle"

Write-Host ""
Write-Host "--- BASE WALK DOWN (Frame 0) ---"
$bmpFWD = [System.Drawing.Bitmap]::FromFile("$charactersDir\base_female_walk_down.png")
$fwd0 = Get-TightBBox $bmpFWD 0 0 321 767
Write-Host "Female Walk Down Frame 0: X=$($fwd0.X), Y=$($fwd0.Y), W=$($fwd0.Width), H=$($fwd0.Height), Bottom=$($fwd0.Bottom)"
$bmpFWD.Dispose()

$bmpMWD = [System.Drawing.Bitmap]::FromFile("$charactersDir\base_male_walk_down.png")
$mwd0 = Get-TightBBox $bmpMWD 0 0 321 767
Write-Host "Male Walk Down Frame 0: X=$($mwd0.X), Y=$($mwd0.Y), W=$($mwd0.Width), H=$($mwd0.Height), Bottom=$($mwd0.Bottom)"
$bmpMWD.Dispose()

Write-Host ""
Write-Host "--- EXISTING OUTFIT ITEMS IDLE ---"
Get-ChildItem -Path $outfitsDir -Recurse -Filter "*_idle.png" | ForEach-Object {
    $bmp = [System.Drawing.Bitmap]::FromFile($_.FullName)
    $box = Get-TightBBox $bmp
    if ($box) {
        Write-Host "$($_.Name) ($($bmp.Width)x$($bmp.Height)): X=$($box.X), Y=$($box.Y), W=$($box.Width), H=$($box.Height), Bottom=$($box.Bottom)"
    } else {
        Write-Host "$($_.Name): EMPTY"
    }
    $bmp.Dispose()
}

Write-Host ""
Write-Host "--- EXISTING OUTFIT WALK SHEETS (Frame 0) ---"
Get-ChildItem -Path $outfitsDir -Recurse -Filter "*_walk_*.png" | ForEach-Object {
    $bmp = [System.Drawing.Bitmap]::FromFile($_.FullName)
    $box0 = Get-TightBBox $bmp 0 0 321 767
    if ($box0) {
        Write-Host "$($_.Name) Frame 0 ($($bmp.Width)x$($bmp.Height)): X=$($box0.X), Y=$($box0.Y), W=$($box0.Width), H=$($box0.Height), Bottom=$($box0.Bottom)"
    } else {
        Write-Host "$($_.Name) Frame 0: EMPTY"
    }
    $bmp.Dispose()
}
