Add-Type -AssemblyName System.Drawing

$sheets = @(
    @{ Key = "base_female_idle"; File = "client/public/assets/characters/base_female_idle.png"; Frames = 1; Gender = "female"; Direction = "idle" },
    @{ Key = "base_female_walk_down"; File = "client/public/assets/characters/base_female_walk_down.png"; Frames = 4; Gender = "female"; Direction = "down" },
    @{ Key = "base_female_walk_up"; File = "client/public/assets/characters/base_female_walk_up.png"; Frames = 4; Gender = "female"; Direction = "up" },
    @{ Key = "base_female_walk_right"; File = "client/public/assets/characters/base_female_walk_right.png"; Frames = 4; Gender = "female"; Direction = "right" },
    @{ Key = "base_male_idle"; File = "client/public/assets/characters/base_male_idle.png"; Frames = 1; Gender = "male"; Direction = "idle" },
    @{ Key = "base_male_walk_down"; File = "client/public/assets/characters/base_male_walk_down.png"; Frames = 4; Gender = "male"; Direction = "down" },
    @{ Key = "base_male_walk_up"; File = "client/public/assets/characters/base_male_walk_up.png"; Frames = 4; Gender = "male"; Direction = "up" },
    @{ Key = "base_male_walk_right"; File = "client/public/assets/characters/base_male_walk_right.png"; Frames = 4; Gender = "male"; Direction = "right" }
)

$landmarksData = @{
    meta = @{
        frameWidth = 321
        frameHeight = 767
        groundY = 762
        description = "Permanent pixel alignment landmarks for all modular outfit items on base characters"
    }
    sheets = @{}
}

function Get-SegmentBox($bmp, $startX, $fw, $yMin, $yMax) {
    $minX = $fw; $maxX = 0; $actualYMin = $yMax; $actualYMax = 0; $has = $false
    for ($y = $yMin; $y -le $yMax; $y++) {
        for ($x = 0; $x -lt $fw; $x++) {
            if ($bmp.GetPixel($startX + $x, $y).A -gt 20) {
                $has = $true
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $actualYMin) { $actualYMin = $y }
                if ($y -gt $actualYMax) { $actualYMax = $y }
            }
        }
    }
    if ($has) {
        return @{
            x = $minX
            y = $actualYMin
            width = ($maxX - $minX + 1)
            height = ($actualYMax - $actualYMin + 1)
        }
    }
    return @{ x = 0; y = 0; width = 0; height = 0 }
}

foreach ($s in $sheets) {
    $path = Resolve-Path $s.File
    $bmp = [System.Drawing.Bitmap]::FromFile($path.Path)
    $fw = [int]($bmp.Width / $s.Frames)
    $fh = $bmp.Height

    $frameList = @()

    for ($f = 0; $f -lt $s.Frames; $f++) {
        $startX = $f * $fw

        $overall = Get-SegmentBox $bmp $startX $fw 0 ($fh - 1)
        $head    = Get-SegmentBox $bmp $startX $fw 4 285
        $torso   = Get-SegmentBox $bmp $startX $fw 286 520
        $legs    = Get-SegmentBox $bmp $startX $fw 521 680
        $feet    = Get-SegmentBox $bmp $startX $fw 681 766

        $frameList += @{
            frameIndex = $f
            overall = $overall
            landmarks = @{
                head = $head
                torso = $torso
                legs = $legs
                feet = $feet
            }
        }
    }
    $bmp.Dispose()

    $landmarksData.sheets[$s.Key] = @{
        gender = $s.Gender
        direction = $s.Direction
        totalFrames = $s.Frames
        frames = $frameList
    }
}

$jsonOutput = $landmarksData | ConvertTo-Json -Depth 6
$outJsonPath = "client/public/assets/characters/base_landmarks.json"
[System.IO.File]::WriteAllText((Resolve-Path .).Path + "/" + $outJsonPath, $jsonOutput)
Write-Output "Successfully generated $outJsonPath"
