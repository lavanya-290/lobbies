Add-Type -AssemblyName System.Drawing

function Get-OpaqueBBox($bmp) {
    $minX = $bmp.Width; $maxX = 0; $minY = $bmp.Height; $maxY = 0; $hasPix = $false
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            if ($bmp.GetPixel($x, $y).A -gt 20) {
                $hasPix = $true
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($hasPix) {
        return [PSCustomObject]@{
            Width = $maxX - $minX + 1
            Height = $maxY - $minY + 1
            MinX = $minX; MaxX = $maxX
            MinY = $minY; MaxY = $maxY
        }
    }
    return $null
}

Write-Output "=== BASE CHARACTERS ==="
foreach ($char in @('client/public/assets/characters/female_idle.png', 'client/public/assets/characters/male_idle.png')) {
    $b = [System.Drawing.Bitmap]::FromFile((Resolve-Path $char).Path)
    $box = Get-OpaqueBBox $b
    Write-Output "$char : Content=$($box.Width)x$($box.Height), X=[$($box.MinX), $($box.MaxX)], Y=[$($box.MinY), $($box.MaxY)]"
    $b.Dispose()
}

Write-Output ""
Write-Output "=== OUTFITS (1024x1024) ==="
$outfits = Get-ChildItem -Recurse -File client/public/assets/outfits
foreach ($o in $outfits) {
    $b = [System.Drawing.Bitmap]::FromFile($o.FullName)
    $box = Get-OpaqueBBox $b
    $rel = $o.FullName.Replace((Resolve-Path .).Path + "\", "")
    Write-Output "$rel : Content=$($box.Width)x$($box.Height), X=[$($box.MinX), $($box.MaxX)], Y=[$($box.MinY), $($box.MaxY)]"
    $b.Dispose()
}
