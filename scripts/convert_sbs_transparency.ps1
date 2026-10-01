param(
    [int]$Tolerance = 3
)

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class SbsBatchTransparencyProcessor {
    public class ProcessResult {
        public string FilePath;
        public string RelativePath;
        public string Category;
        public int ImageWidth;
        public int ImageHeight;
        public int TileWidth;
        public int TileHeight;
        public int Columns;
        public int Rows;
        public string ColorKeyHex;
        public bool IsCleanCorner;
        public string Note;
        public int PixelsCleared;
        public double TransparentPercent;
    }

    public static ProcessResult ProcessFile(string filePath, string relPath, string category, int tileW, int tileH, int tolerance) {
        ProcessResult res = new ProcessResult();
        res.FilePath = filePath;
        res.RelativePath = relPath;
        res.Category = category;

        int w = 0;
        int h = 0;
        byte[] pixelBuffer;
        int keyR = 0;
        int keyG = 0;
        int keyB = 0;

        byte[] srcBytes = File.ReadAllBytes(filePath);
        using (MemoryStream ms = new MemoryStream(srcBytes))
        using (Bitmap src = new Bitmap(ms)) {
            w = src.Width;
            h = src.Height;

            res.ImageWidth = w;
            res.ImageHeight = h;
            res.TileWidth = tileW > 0 ? tileW : w;
            res.TileHeight = tileH > 0 ? tileH : h;
            res.Columns = w / res.TileWidth;
            res.Rows = h / res.TileHeight;

            Color tl = src.GetPixel(0, 0);
            Color tr = src.GetPixel(w - 1, 0);
            Color bl = src.GetPixel(0, h - 1);
            Color br = src.GetPixel(w - 1, h - 1);

            if (tl.A == 0 && tr.A == 0 && bl.A == 0 && br.A == 0) {
                res.ColorKeyHex = "ALREADY_ALPHA";
                res.IsCleanCorner = true;
                res.Note = "Already transparent";
                return res;
            }

            Color[] corners = new Color[] { tl, tr, bl, br };
            Dictionary<int, int> counts = new Dictionary<int, int>();
            foreach (var c in corners) {
                int rgb = (c.R << 16) | (c.G << 8) | c.B;
                if (counts.ContainsKey(rgb)) counts[rgb]++;
                else counts[rgb] = 1;
            }

            int bestRgb = 0;
            int bestCount = 0;
            foreach (var kvp in counts) {
                if (kvp.Value > bestCount) {
                    bestCount = kvp.Value;
                    bestRgb = kvp.Key;
                }
            }

            keyR = (bestRgb >> 16) & 0xFF;
            keyG = (bestRgb >> 8) & 0xFF;
            keyB = bestRgb & 0xFF;

            res.ColorKeyHex = string.Format("#{0:X2}{1:X2}{2:X2}", keyR, keyG, keyB);
            res.IsCleanCorner = (bestCount == 4);
            res.Note = res.IsCleanCorner ? "Clean 4-corner match" : string.Format("3/4 corners match ({0} was tile artwork)", 4 - bestCount);

            using (Bitmap dest32 = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                using (Graphics gr = Graphics.FromImage(dest32)) {
                    gr.DrawImage(src, 0, 0, w, h);
                }

                BitmapData bmpData = dest32.LockBits(
                    new Rectangle(0, 0, w, h),
                    ImageLockMode.ReadOnly,
                    PixelFormat.Format32bppArgb
                );

                int totalBytes = Math.Abs(bmpData.Stride) * h;
                pixelBuffer = new byte[totalBytes];
                Marshal.Copy(bmpData.Scan0, pixelBuffer, 0, totalBytes);
                dest32.UnlockBits(bmpData);
            }
        }

        // Flood-fill logic
        int stride = w * 4;
        bool[] visited = new bool[w * h];
        Queue<int> queue = new Queue<int>();

        Func<int, int, bool> isMatch = (x, y) => {
            int offset = y * stride + x * 4;
            int b = pixelBuffer[offset];
            int g = pixelBuffer[offset + 1];
            int r = pixelBuffer[offset + 2];
            int a = pixelBuffer[offset + 3];

            if (a == 0) return false;
            return Math.Abs(r - keyR) <= tolerance &&
                   Math.Abs(g - keyG) <= tolerance &&
                   Math.Abs(b - keyB) <= tolerance;
        };

        Action<int, int> tryEnqueue = (x, y) => {
            if (x >= 0 && x < w && y >= 0 && y < h) {
                int idx = y * w + x;
                if (!visited[idx] && isMatch(x, y)) {
                    visited[idx] = true;
                    queue.Enqueue(idx);
                }
            }
        };

        // 1. Seed outer borders
        for (int x = 0; x < w; x++) {
            tryEnqueue(x, 0);
            tryEnqueue(x, h - 1);
        }
        for (int y = 0; y < h; y++) {
            tryEnqueue(0, y);
            tryEnqueue(w - 1, y);
        }

        // 2. Seed cell grid borders
        int cols = res.Columns;
        int rows = res.Rows;
        int tw = res.TileWidth;
        int th = res.TileHeight;

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                int x0 = c * tw;
                int y0 = r * th;
                int x1 = x0 + tw - 1;
                int y1 = y0 + th - 1;

                for (int x = x0; x <= x1; x++) {
                    tryEnqueue(x, y0);
                    tryEnqueue(x, y1);
                }
                for (int y = y0; y <= y1; y++) {
                    tryEnqueue(x0, y);
                    tryEnqueue(x1, y);
                }
            }
        }

        // 3. BFS flood fill
        int cleared = 0;
        while (queue.Count > 0) {
            int idx = queue.Dequeue();
            int x = idx % w;
            int y = idx / w;

            int offset = y * stride + x * 4;
            pixelBuffer[offset] = 0;     // B
            pixelBuffer[offset + 1] = 0; // G
            pixelBuffer[offset + 2] = 0; // R
            pixelBuffer[offset + 3] = 0; // Alpha = 0 (Transparent)
            cleared++;

            tryEnqueue(x + 1, y);
            tryEnqueue(x - 1, y);
            tryEnqueue(x, y + 1);
            tryEnqueue(x, y - 1);
        }

        res.PixelsCleared = cleared;
        res.TransparentPercent = Math.Round((double)cleared / (w * h) * 100.0, 2);

        using (Bitmap outBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
            BitmapData outData = outBmp.LockBits(
                new Rectangle(0, 0, w, h),
                ImageLockMode.WriteOnly,
                PixelFormat.Format32bppArgb
            );
            Marshal.Copy(pixelBuffer, 0, outData.Scan0, pixelBuffer.Length);
            outBmp.UnlockBits(outData);

            using (MemoryStream outMs = new MemoryStream()) {
                outBmp.Save(outMs, ImageFormat.Png);
                File.WriteAllBytes(filePath, outMs.ToArray());
            }
        }

        return res;
    }
}
'@

$dirs = @(
    "client/public/assets/tiles",
    "client/public/assets/walls",
    "client/public/assets/overworld"
)

$pngFiles = foreach ($d in $dirs) {
    if (Test-Path $d) {
        Get-ChildItem -Path $d -Recurse -Filter "*.png"
    }
}

Write-Host "Found $($pngFiles.Count) PNG files to process.`n"

$results = @()
$rootPath = (Get-Location).Path

foreach ($f in $pngFiles) {
    $rel = $f.FullName.Replace($rootPath + "\", "")
    $cat = $f.Directory.Parent.Name + "\" + $f.Directory.Name
    
    # Resolve tile dimensions
    $tileW = 0
    $tileH = 0
    
    $tsxPath = [System.IO.Path]::ChangeExtension($f.FullName, ".tsx")
    if (-not (Test-Path $tsxPath)) {
        $parent = $f.Directory.FullName
        $altTsx = [System.IO.Path]::Combine($parent, "Tiled Tsx", ($f.BaseName + ".tsx"))
        if (Test-Path $altTsx) {
            $tsxPath = $altTsx
        } else {
            $found = Get-ChildItem -Path $f.Directory.Parent.FullName -Recurse -Filter ($f.BaseName + ".tsx") -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) { $tsxPath = $found.FullName }
        }
    }
    
    if (Test-Path $tsxPath) {
        try {
            $xml = [xml](Get-Content $tsxPath -Raw)
            $tileW = [int]$xml.tileset.tilewidth
            $tileH = [int]$xml.tileset.tileheight
        } catch {}
    }
    
    if ($tileW -eq 0 -or $tileH -eq 0) {
        if ($f.Name -match "(\d+)x(\d+)") {
            $tileW = [int]$Matches[1]
            $tileH = [int]$Matches[2]
        }
    }
    
    $res = [SbsBatchTransparencyProcessor]::ProcessFile($f.FullName, $rel, $cat, $tileW, $tileH, $Tolerance)
    $results += $res
}

Write-Host "`nProcessing complete for all $($results.Count) files!`n"

# Export report to JSON for permanent record and validation
$resultsJson = $results | ConvertTo-Json -Depth 4
Set-Content -Path "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\scratch\sbs_transparency_report.json" -Value $resultsJson -Encoding UTF8

Write-Host "Results saved to scratch/sbs_transparency_report.json"
