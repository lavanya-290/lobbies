Add-Type -AssemblyName System.Drawing

function Get-AlphaBounds($bmp, $startX, $startY, $width, $height) {
    $minX = $width; $minY = $height; $maxX = 0; $maxY = 0
    $has = $false
    for ($y = 0; $y -lt $height; $y++) {
        for ($x = 0; $x -lt $width; $x++) {
            $p = $bmp.GetPixel($startX + $x, $startY + $y)
            if ($p.A -gt 25) {
                $has = $true
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if (-not $has) { return $null }
    return [PSCustomObject]@{
        MinX = $minX; MaxX = $maxX; MinY = $minY; MaxY = $maxY
        Width = ($maxX - $minX + 1); Height = ($maxY - $minY + 1)
        TopY = $minY; BottomY = $maxY
    }
}

$charDir = "client\public\assets\characters"
$outfitDir = "client\public\assets\outfits"

Write-Host "=========================================="
Write-Host "1. BASE CHARACTER ANATOMY MEASUREMENTS"
Write-Host "=========================================="

$bases = @(
    @{ Name = "base_female_idle"; Path = "$charDir\base_female_idle.png"; Frames = 1 },
    @{ Name = "base_female_walk_down"; Path = "$charDir\base_female_walk_down.png"; Frames = 4 },
    @{ Name = "base_female_walk_up"; Path = "$charDir\base_female_walk_up.png"; Frames = 4 },
    @{ Name = "base_female_walk_right"; Path = "$charDir\base_female_walk_right.png"; Frames = 4 },
    @{ Name = "base_male_idle"; Path = "$charDir\base_male_idle.png"; Frames = 1 },
    @{ Name = "base_male_walk_down"; Path = "$charDir\base_male_walk_down.png"; Frames = 4 },
    @{ Name = "base_male_walk_up"; Path = "$charDir\base_male_walk_up.png"; Frames = 4 },
    @{ Name = "base_male_walk_right"; Path = "$charDir\base_male_walk_right.png"; Frames = 4 }
)

foreach ($b in $bases) {
    if (-not (Test-Path $b.Path)) {
        Write-Host "Missing: $($b.Path)"
        continue
    }
    $bmp = [System.Drawing.Bitmap]::FromFile($b.Path)
    Write-Host "`n$($b.Name) (Total: $($bmp.Width)x$($bmp.Height), $($b.Frames) frames):"
    $frameW = [int]($bmp.Width / $b.Frames)
    for ($f = 0; $f -lt $b.Frames; $f++) {
        $bounds = Get-AlphaBounds $bmp ($f * $frameW) 0 $frameW $bmp.Height
        if ($bounds) {
            Write-Host ("  Frame {0}: X=[{1}..{2}] Y=[{3}..{4}] (W={5}, H={6})" -f $f, $bounds.MinX, $bounds.MaxX, $bounds.MinY, $bounds.MaxY, $bounds.Width, $bounds.Height)
        }
    }
    $bmp.Dispose()
}

Write-Host "`n=========================================="
Write-Host "2. MEASURING OUTFIT SPRITE BOUNDS (EXISTING & NEW)"
Write-Host "=========================================="

$itemsToAudit = @(
    # Existing working items
    @{ Category = "top"; Folder = "casual"; Id = "crop_top" },
    @{ Category = "bottom"; Folder = "casual"; Id = "culottes" },
    @{ Category = "top"; Folder = "casual"; Id = "henley_shirt" },
    @{ Category = "bottom"; Folder = "casual"; Id = "jeans_regular" },
    @{ Category = "headwear"; Folder = "japanese"; Id = "conical_hat" },
    @{ Category = "headwear"; Folder = "pirate"; Id = "tricorn_hat" },
    @{ Category = "face_accessory"; Folder = "pirate"; Id = "eyepatch_accessory" },
    # Newly assembled items
    @{ Category = "dress"; Folder = "japanese"; Id = "kimono_casual" },
    @{ Category = "dress"; Folder = "japanese"; Id = "yukata_summer" },
    @{ Category = "footwear"; Folder = "japanese"; Id = "geta_sandals" },
    @{ Category = "bottom"; Folder = "japanese"; Id = "hakama_pants" }
)

$directions = @("idle", "walk_down", "walk_up", "walk_right")

foreach ($item in $itemsToAudit) {
    Write-Host ("`nItem: {0} ({1} - {2}):" -f $item.Id, $item.Category, $item.Folder)
    foreach ($dir in $directions) {
        $sheetPath = "$outfitDir\$($item.Folder)\$($item.Id)_$dir.png"
        if (-not (Test-Path $sheetPath)) {
            Write-Host ("  {0}: [NOT FOUND]" -f $dir)
            continue
        }
        $bmp = [System.Drawing.Bitmap]::FromFile($sheetPath)
        $frames = if ($dir -eq "idle") { 1 } else { 4 }
        $frameW = [int]($bmp.Width / $frames)
        $frame0 = Get-AlphaBounds $bmp 0 0 $frameW $bmp.Height
        if ($frame0) {
            Write-Host ("  {0}: TopY={1}, BottomY={2}, H={3}, W={4}" -f $dir, $frame0.TopY, $frame0.BottomY, $frame0.Height, $frame0.Width)
        } else {
            Write-Host ("  {0}: [EMPTY/TRANSPARENT]" -f $dir)
        }
        $bmp.Dispose()
    }
}
