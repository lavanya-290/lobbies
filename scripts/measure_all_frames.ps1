Add-Type -AssemblyName System.Drawing

function Measure-AllFrames() {
    $sheets = @(
        @{ Name = "female_idle"; File = "client/public/assets/characters/base_female_idle.png"; Frames = 1 },
        @{ Name = "female_walk_down"; File = "client/public/assets/characters/base_female_walk_down.png"; Frames = 4 },
        @{ Name = "female_walk_up"; File = "client/public/assets/characters/base_female_walk_up.png"; Frames = 4 },
        @{ Name = "female_walk_right"; File = "client/public/assets/characters/base_female_walk_right.png"; Frames = 4 },
        @{ Name = "male_idle"; File = "client/public/assets/characters/base_male_idle.png"; Frames = 1 },
        @{ Name = "male_walk_down"; File = "client/public/assets/characters/base_male_walk_down.png"; Frames = 4 },
        @{ Name = "male_walk_up"; File = "client/public/assets/characters/base_male_walk_up.png"; Frames = 4 },
        @{ Name = "male_walk_right"; File = "client/public/assets/characters/base_male_walk_right.png"; Frames = 4 }
    )

    $results = @()

    foreach ($s in $sheets) {
        $path = Resolve-Path $s.File
        $bmp = [System.Drawing.Bitmap]::FromFile($path.Path)
        $fw = [int]($bmp.Width / $s.Frames)
        $fh = $bmp.Height

        for ($f = 0; $f -lt $s.Frames; $f++) {
            $startX = $f * $fw
            $minX = $fw; $maxX = 0; $minY = $fh; $maxY = 0; $has = $false

            for ($y = 0; $y -lt $fh; $y++) {
                for ($x = 0; $x -lt $fw; $x++) {
                    $c = $bmp.GetPixel($startX + $x, $y)
                    if ($c.A -gt 20) {
                        $has = $true
                        if ($x -lt $minX) { $minX = $x }
                        if ($x -gt $maxX) { $maxX = $x }
                        if ($y -lt $minY) { $minY = $y }
                        if ($y -gt $maxY) { $maxY = $y }
                    }
                }
            }

            if ($has) {
                $w = $maxX - $minX + 1
                $h = $maxY - $minY + 1
                $distFromBottom = $fh - 1 - $maxY
                $results += [PSCustomObject]@{
                    Sheet = $s.Name
                    Frame = $f
                    Width = $w
                    Height = $h
                    MinX = $minX
                    MaxX = $maxX
                    TopY = $minY
                    BottomY = $maxY
                    DistFromBottom = $distFromBottom
                }
            } else {
                $results += [PSCustomObject]@{
                    Sheet = $s.Name
                    Frame = $f
                    Width = 0
                    Height = 0
                    MinX = 0
                    MaxX = 0
                    TopY = 0
                    BottomY = 0
                    DistFromBottom = 0
                }
            }
        }
        $bmp.Dispose()
    }

    $results | Format-Table -AutoSize
}

Measure-AllFrames
