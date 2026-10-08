Add-Type -AssemblyName System.Drawing

$baseDir = "client/public/assets/walls/SBS - Isometric Wall Pack - Small/Small Wall Tiles/Flat 64x96"
$outDir = "client/public/assets/walls/singles"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$slices = @(
    @{ Src = "$baseDir/Flat_Wood_01-SE-64x96.png";          Out = "$outDir/wall_wood_se.png" },
    @{ Src = "$baseDir/Flat_Wood_01-SW-64x96.png";          Out = "$outDir/wall_wood_sw.png" },
    @{ Src = "$baseDir/Flat_Wood_01_WindowA-SE-64x96.png";   Out = "$outDir/wall_wood_window_se.png" },
    @{ Src = "$baseDir/Flat_Wood_01_WindowA-SW-64x96.png";   Out = "$outDir/wall_wood_window_sw.png" },
    @{ Src = "$baseDir/Flat_Brick_01-SE-64x96.png";         Out = "$outDir/wall_brick_se.png" },
    @{ Src = "$baseDir/Flat_Brick_01-SW-64x96.png";         Out = "$outDir/wall_brick_sw.png" },
    @{ Src = "$baseDir/Flat_Brick_01_WindowA-SE-64x96.png";  Out = "$outDir/wall_brick_window_se.png" },
    @{ Src = "$baseDir/Flat_Brick_01_WindowA-SW-64x96.png";  Out = "$outDir/wall_brick_window_sw.png" },
    @{ Src = "$baseDir/Flat_Stone_01-SE-64x96.png";         Out = "$outDir/wall_stone_se.png" },
    @{ Src = "$baseDir/Flat_Stone_01-SW-64x96.png";         Out = "$outDir/wall_stone_sw.png" },
    @{ Src = "$baseDir/Flat_Stone_01_WindowA-SE-64x96.png";  Out = "$outDir/wall_stone_window_se.png" },
    @{ Src = "$baseDir/Flat_Stone_01_WindowA-SW-64x96.png";  Out = "$outDir/wall_stone_window_sw.png" }
)

foreach ($item in $slices) {
    if (Test-Path $item.Src) {
        $bmp = [System.Drawing.Bitmap]::FromFile($item.Src)
        # Use col 0 (x=0) for SE (NW wall, slopes up-right) and col 1 (x=64) for SW (NE wall, slopes down-right)
        $isSW = $item.Out -like "*_sw.png"
        $colX = if ($isSW) { 64 } else { 0 }
        $rect = New-Object System.Drawing.Rectangle $colX, 0, 64, 96
        $tile = $bmp.Clone($rect, $bmp.PixelFormat)
        $tile.Save($item.Out, [System.Drawing.Imaging.ImageFormat]::Png)
        $tile.Dispose()
        $bmp.Dispose()
        Write-Host "Extracted -> $($item.Out) (col=$colX)"
    } else {
        Write-Warning "Source not found: $($item.Src)"
    }
}
