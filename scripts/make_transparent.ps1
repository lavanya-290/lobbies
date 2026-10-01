param(
    [Parameter(Mandatory=$true)]
    [string]$InputPath,
    
    [Parameter(Mandatory=$true)]
    [string]$OutputPath,
    
    [int]$Tolerance = 15,
    [switch]$ClearEnclosedWhite
)

$csharpCode = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public class TransparencyProcessor {
    public static void FloodFillAlpha(string srcPath, string destPath, int tolerance) {
        using (Bitmap src = new Bitmap(srcPath)) {
            int w = src.Width;
            int h = src.Height;
            Bitmap dest = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    dest.SetPixel(x, y, src.GetPixel(x, y));
                }
            }
            
            bool[,] visited = new bool[w, h];
            Queue<Point> queue = new Queue<Point>();
            
            Action<int, int> tryEnqueue = (x, y) => {
                if (x >= 0 && x < w && y >= 0 && y < h && !visited[x, y]) {
                    Color c = dest.GetPixel(x, y);
                    if (c.R >= (255 - tolerance) && c.G >= (255 - tolerance) && c.B >= (255 - tolerance)) {
                        visited[x, y] = true;
                        queue.Enqueue(new Point(x, y));
                    }
                }
            };
            
            for (int x = 0; x < w; x++) {
                tryEnqueue(x, 0);
                tryEnqueue(x, h - 1);
            }
            for (int y = 0; y < h; y++) {
                tryEnqueue(0, y);
                tryEnqueue(w - 1, y);
            }
            
            while (queue.Count > 0) {
                Point p = queue.Dequeue();
                dest.SetPixel(p.X, p.Y, Color.FromArgb(0, 0, 0, 0));
                
                int[] dx = { 1, -1, 0, 0 };
                int[] dy = { 0, 0, 1, -1 };
                for (int i = 0; i < 4; i++) {
                    tryEnqueue(p.X + dx[i], p.Y + dy[i]);
                }
            }
            
            dest.Save(destPath, ImageFormat.Png);
            dest.Dispose();
        }
    }

    public static void ClearAllWhite(string srcPath, string destPath, int tolerance) {
        using (Bitmap src = new Bitmap(srcPath)) {
            int w = src.Width;
            int h = src.Height;
            Bitmap dest = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    Color c = src.GetPixel(x, y);
                    if (c.R >= (255 - tolerance) && c.G >= (255 - tolerance) && c.B >= (255 - tolerance)) {
                        dest.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                    } else {
                        dest.SetPixel(x, y, c);
                    }
                }
            }
            dest.Save(destPath, ImageFormat.Png);
            dest.Dispose();
        }
    }
}
'@

if (-not ([System.Management.Automation.PSTypeName]'TransparencyProcessor').Type) {
    Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing
}

$parent = Split-Path -Parent $OutputPath
if ($parent -and !(Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

if ($ClearEnclosedWhite) {
    [TransparencyProcessor]::ClearAllWhite($InputPath, $OutputPath, $Tolerance)
} else {
    [TransparencyProcessor]::FloodFillAlpha($InputPath, $OutputPath, $Tolerance)
}
Write-Output "Created transparent PNG: $OutputPath"
