Add-Type -AssemblyName System.Drawing
$files = @(
  'client/public/assets/tiles/SBS - Isometric Floor Tiles - Small 128x64/Small 128x64/Interior/Wood/Floor_Wood_01-128x64.png',
  'client/public/assets/tiles/SBS - Isometric Floor Tiles - Small 128x64/Small 128x64/Interior/Tile/Floor_Tile_01-128x64.png',
  'client/public/assets/tiles/SBS - Isometric Floor Tiles - Small 128x64/Small 128x64/Interior/Pattern/Floor_Pattern_01-128x64.png',
  'client/public/assets/tiles/SBS - Isometric Floor Tiles - Small 128x64/Small 128x64/Interior/Brick/Floor_Brick_01-128x64.png',
  'client/public/assets/tiles/SBS - Isometric Floor Tiles - Small 128x64/Small 128x64/Interior/Stone/Floor_Stone_01-128x64.png'
)
foreach ($f in $files) {
  $bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $f))
  $opaque = 0
  for ($y = 0; $y -lt 64; $y++) {
    for ($x = 0; $x -lt 128; $x++) {
      if ($bmp.GetPixel($x, $y).A -gt 10) { $opaque++ }
    }
  }
  $bmp.Dispose()
  Write-Output "$([System.IO.Path]::GetFileName($f)) frame 0 opaque pixels: $opaque / 8192"
}
