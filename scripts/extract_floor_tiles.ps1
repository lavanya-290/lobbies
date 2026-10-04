Add-Type -AssemblyName System.Drawing

$outDir = 'client/public/assets/tiles/floors'
if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$base = 'client/public/assets/tiles/SBS - Isometric Floor Tiles - Small 128x64/Small 128x64'

$mapping = @{
  'floor_wood_oak'         = "$base/Interior/Wood/Floor_Wood_01-128x64.png"
  'floor_wood_mahogany'    = "$base/Interior/Wood/Floor_Wood_02-128x64.png"
  'floor_tile_ceramic'     = "$base/Interior/Tile/Floor_Tile_01-128x64.png"
  'floor_tile_checker'     = "$base/Interior/Tile/Floor_Tile_02-128x64.png"
  'floor_pattern_carpet'   = "$base/Interior/Pattern/Floor_Pattern_01-128x64.png"
  'floor_pattern_mosaic'   = "$base/Interior/Pattern/Floor_Pattern_02-128x64.png"
  'floor_brick_terracotta' = "$base/Interior/Brick/Floor_Brick_01-128x64.png"
  'floor_stone_slate'      = "$base/Interior/Stone/Floor_Stone_01-128x64.png"
  'floor_stone_cobble'     = "$base/Interior/Stone/Floor_Stone_02-128x64.png"
  'floor_metal_steel'      = "$base/Interior/Metal/Floor_Metal_01-128x64.png"
  'floor_grill_deck'       = "$base/Interior/Grill/Floor_Grill_01-128x64.png"
  'floor_grass_garden'     = "$base/Exterior/Grass/Floor_Grass_01-128x64.png"
  'floor_flora_meadow'     = "$base/Exterior/Flora/Floor_Flora_01-128x64.png"
  'floor_ice_crystal'      = "$base/Exterior/Ice/Floor_Ice_01-128x64.png"
}

foreach ($key in $mapping.Keys) {
  $srcPath = Resolve-Path $mapping[$key]
  $srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
  
  $tileBmp = New-Object System.Drawing.Bitmap(128, 64, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($tileBmp)
  $rectSrc = New-Object System.Drawing.Rectangle(0, 0, 128, 64)
  $rectDest = New-Object System.Drawing.Rectangle(0, 0, 128, 64)
  $g.DrawImage($srcBmp, $rectDest, $rectSrc, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $srcBmp.Dispose()

  $destPath = "$outDir/$key.png"
  $tileBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $tileBmp.Dispose()
  Write-Output "Extracted $key -> $destPath"
}
