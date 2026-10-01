$csharpCode = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public class WalkSheetProcessor {
    public static void ProcessWalkSheet(string inputJpg, string outputPng, int sharedFrameW, int sharedFrameH, int targetContentH) {
        Bitmap raw;
        using (Bitmap src = new Bitmap(inputJpg)) {
            raw = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb);
            for (int y = 0; y < src.Height; y++) {
                for (int x = 0; x < src.Width; x++) {
                    raw.SetPixel(x, y, src.GetPixel(x, y));
                }
            }
        }

        int w = raw.Width, h = raw.Height;
        bool[,] visited = new bool[w, h];
        Queue<Point> q = new Queue<Point>();
        int tol = 30;

        Action<int, int> tryEnq = (x, y) => {
            if (x >= 0 && x < w && y >= 0 && y < h && !visited[x, y]) {
                Color c = raw.GetPixel(x, y);
                if (c.R >= (255 - tol) && c.G >= (255 - tol) && c.B >= (255 - tol)) {
                    visited[x, y] = true;
                    q.Enqueue(new Point(x, y));
                }
            }
        };

        for (int x = 0; x < w; x++) { tryEnq(x, 0); tryEnq(x, h - 1); }
        for (int y = 0; y < h; y++) { tryEnq(0, y); tryEnq(w - 1, y); }

        while (q.Count > 0) {
            Point p = q.Dequeue();
            raw.SetPixel(p.X, p.Y, Color.FromArgb(0, 0, 0, 0));
            int[] dx = { 1, -1, 0, 0 };
            int[] dy = { 0, 0, 1, -1 };
            for (int i = 0; i < 4; i++) tryEnq(p.X + dx[i], p.Y + dy[i]);
        }

        // Clear interior isolated pure white voids
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                Color c = raw.GetPixel(x, y);
                if (c.A > 0 && c.R >= 250 && c.G >= 250 && c.B >= 250) {
                    raw.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                }
            }
        }

        int fw = w / 4;
        int stripW = 4 * sharedFrameW;
        int stripH = sharedFrameH;
        int groundY = sharedFrameH - 4; // Y=763, feet at 762

        Bitmap strip = new Bitmap(stripW, stripH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(strip)) {
            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;

            for (int frame = 0; frame < 4; frame++) {
                int frameStartX = frame * fw;
                int minX = fw, maxX = 0, minY = h, maxY = 0;

                for (int y = 0; y < h; y++) {
                    for (int x = 0; x < fw; x++) {
                        if (raw.GetPixel(frameStartX + x, y).A > 20) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                int tightW = maxX - minX + 1;
                int tightH = maxY - minY + 1;

                // Scale to match target content height (759px) exactly, preventing any walking shrinkage
                double scale = (double)targetContentH / tightH;
                int drawW = (int)Math.Round(tightW * scale);
                int drawH = targetContentH;

                int frameDestX = (frame * sharedFrameW) + ((sharedFrameW - drawW) / 2);
                int frameDestY = groundY - drawH;

                Rectangle destRect = new Rectangle(frameDestX, frameDestY, drawW, drawH);
                Rectangle srcRect = new Rectangle(frameStartX + minX, minY, tightW, tightH);
                
                // Clip strictly to current frame to prevent any bleeding across frame boundaries
                g.SetClip(new Rectangle(frame * sharedFrameW, 0, sharedFrameW, sharedFrameH));
                g.DrawImage(raw, destRect, srcRect, GraphicsUnit.Pixel);
                g.ResetClip();

                Console.WriteLine(string.Format("  Frame {0}: RawContent={1}x{2}, ScaledTo={3}x{4}, PlacedAt=({5}, {6})",
                    frame, tightW, tightH, drawW, drawH, frameDestX, frameDestY));
            }
        }

        strip.Save(outputPng, ImageFormat.Png);
        Console.WriteLine(string.Format("Successfully saved {0} (Strip: {1}x{2})\n", outputPng, stripW, stripH));
        raw.Dispose();
        strip.Dispose();
    }
}
'@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$sheets = @(
    @{ Input = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\base_female_walk_down_1790576284511.jpg"; Output = "client/public/assets/characters/base_female_walk_down.png"; Name = "Female Walk Down" },
    @{ Input = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\base_female_walk_up_1790576311590.jpg"; Output = "client/public/assets/characters/base_female_walk_up.png"; Name = "Female Walk Up" },
    @{ Input = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\base_female_walk_right_1790576334921.jpg"; Output = "client/public/assets/characters/base_female_walk_right.png"; Name = "Female Walk Right" },
    @{ Input = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\base_male_walk_down_1790576356402.jpg"; Output = "client/public/assets/characters/base_male_walk_down.png"; Name = "Male Walk Down" },
    @{ Input = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\base_male_walk_up_1790576381659.jpg"; Output = "client/public/assets/characters/base_male_walk_up.png"; Name = "Male Walk Up" },
    @{ Input = "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\base_male_walk_right_1790576403125.jpg"; Output = "client/public/assets/characters/base_male_walk_right.png"; Name = "Male Walk Right" }
)

foreach ($s in $sheets) {
    Write-Output "=== Processing $($s.Name) ==="
    $outPath = [System.IO.Path]::GetFullPath($s.Output)
    [WalkSheetProcessor]::ProcessWalkSheet($s.Input, $outPath, 321, 767, 759)
}
