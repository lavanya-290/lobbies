Add-Type -AssemblyName System.Drawing

Write-Output "=== CHECKING CHARACTERS ==="
foreach ($name in @('female_idle.png', 'male_idle.png', 'female_walk_down.png', 'male_walk_down.png')) {
    $path = "client/public/assets/characters/$name"
    $b = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path).Path)
    $c00 = $b.GetPixel(0, 0)
    $c10 = $b.GetPixel(10, 10)
    $cMid = $b.GetPixel([int]($b.Width/2), 10)
    Write-Output "${name}:"
    Write-Output "  Corner (0,0):   A=$($c00.A) R=$($c00.R) G=$($c00.G) B=$($c00.B)"
    Write-Output "  Corner (10,10): A=$($c10.A) R=$($c10.R) G=$($c10.G) B=$($c10.B)"
    Write-Output "  TopMid (mid,10): A=$($cMid.A) R=$($cMid.R) G=$($cMid.G) B=$($cMid.B)"
    $b.Dispose()
}

Write-Output ""
Write-Output "=== CHECKING OUTFITS ==="
$outfits = Get-ChildItem -Recurse -File client/public/assets/outfits
foreach ($o in $outfits) {
    $b = [System.Drawing.Bitmap]::FromFile($o.FullName)
    $c00 = $b.GetPixel(0, 0)
    $c10 = $b.GetPixel(10, 10)
    Write-Output "$($o.Name): (0,0) A=$($c00.A) | (10,10) A=$($c10.A)"
    $b.Dispose()
}
