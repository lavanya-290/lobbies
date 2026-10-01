$csharpCode = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public class TransparencyProcessor {
    public static void ProcessAndSave(string inputJpg, string outputPng, int sharedFrameW, int sharedFrameH) {
        Bitmap res;
        using (Bitmap src = new Bitmap(inputJpg)) {
            res = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb);
            for (int y = 0; y < src.Height; y++) {
                for (int x = 0; x < src.Width; x++) {
                    res.SetPixel(x, y, src.GetPixel(x, y));
                }
            }
        }

        // 1. Flood fill from border
        int w = res.Width, h = res.Height;
        bool[,] visited = new bool[w, h];
        Queue<Point> q = new Queue<Point>();
        int tol = 30;

        Action<int, int> tryEnq = (x, y) => {
            if (x >= 0 && x < w && y >= 0 && y < h && !visited[x, y]) {
                Color c = res.GetPixel(x, y);
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
            res.SetPixel(p.X, p.Y, Color.FromArgb(0, 0, 0, 0));
            int[] dx = { 1, -1, 0, 0 };
            int[] dy = { 0, 0, 1, -1 };
            for (int i = 0; i < 4; i++) tryEnq(p.X + dx[i], p.Y + dy[i]);
        }

        // Also check any isolated pure white regions inside inner voids
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                Color c = res.GetPixel(x, y);
                if (c.A > 0 && c.R >= 250 && c.G >= 250 && c.B >= 250) {
                    // Check if it's white background artifact
                    res.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                }
            }
        }

        // 2. Find tight bounding box
        int minX = w, maxX = 0, minY = h, maxY = 0;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                if (res.GetPixel(x, y).A > 20) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        int tightW = maxX - minX + 1;
        int tightH = maxY - minY + 1;
        Console.WriteLine(string.Format("Tight content: {0}x{1} at X=[{2}, {3}], Y=[{4}, {5}]",
            tightW, tightH, minX, maxX, minY, maxY));

        // 3. Create standardized canvas (321 x 767)
        int groundY = sharedFrameH - 4; // 763, bottom pixel at 762
        int destX = (sharedFrameW - tightW) / 2;
        int destY = groundY - tightH;

        Bitmap finalCanvas = new Bitmap(sharedFrameW, sharedFrameH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(finalCanvas)) {
            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
            Rectangle destRect = new Rectangle(destX, destY, tightW, tightH);
            Rectangle srcRect = new Rectangle(minX, minY, tightW, tightH);
            g.DrawImage(res, destRect, srcRect, GraphicsUnit.Pixel);
        }

        finalCanvas.Save(outputPng, ImageFormat.Png);
        Console.WriteLine(string.Format("Saved standardized PNG to {0} (Canvas: {1}x{2}, placed at ({3}, {4}))",
            outputPng, sharedFrameW, sharedFrameH, destX, destY));

        res.Dispose();
        finalCanvas.Dispose();
    }
}
'@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing
[TransparencyProcessor]::ProcessAndSave(
    "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\base_female_idle_1790575905448.jpg",
    "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters\base_female_idle.png",
    321,
    767
)

[TransparencyProcessor]::ProcessAndSave(
    "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\base_male_idle_1790575926496.jpg",
    "c:\Users\lavanya.singh\Downloads\habbo-clone-phase1\client\public\assets\characters\base_male_idle.png",
    321,
    767
)
