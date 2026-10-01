# Normalize 8 character sprite sheets into uniform bottom-anchored horizontal strips
$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Collections.Generic;

public class SpriteNormalizer {
    public class FrameInfo {
        public Bitmap TightBmp;
        public string Direction;
        public int FrameIndex;
    }

    public static void NormalizeAll(string baseDir) {
        string[] genders = new string[] { "female", "male" };
        
        foreach (string gender in genders) {
            Console.WriteLine("========================================");
            Console.WriteLine("Processing " + gender.ToUpper() + " sprites...");
            Console.WriteLine("========================================");
            
            List<FrameInfo> allFrames = new List<FrameInfo>();
            
            // 1. Process Idle (1 frame)
            string idlePath = Path.Combine(baseDir, "chibi_" + gender + "_idle.png");
            using (Bitmap rawIdle = LoadWithTransparency(idlePath)) {
                Rectangle bbox = GetBBox(rawIdle, 0, 0, rawIdle.Width, rawIdle.Height);
                Bitmap tight = Crop(rawIdle, bbox);
                allFrames.Add(new FrameInfo { TightBmp = tight, Direction = "idle", FrameIndex = 0 });
                Console.WriteLine("idle tight: " + tight.Width + "x" + tight.Height);
            }
            
            // 2. Process Walks (4 frames each)
            string[] dirs = new string[] { "walk_down", "walk_up", "walk_right" };
            foreach (string dir in dirs) {
                string walkPath = Path.Combine(baseDir, "chibi_" + gender + "_" + dir + ".png");
                using (Bitmap rawWalk = LoadWithTransparency(walkPath)) {
                    int fw = rawWalk.Width / 4;
                    for (int i = 0; i < 4; i++) {
                        Rectangle bbox = GetBBox(rawWalk, i * fw, 0, fw, rawWalk.Height);
                        Bitmap tight = Crop(rawWalk, bbox);
                        allFrames.Add(new FrameInfo { TightBmp = tight, Direction = dir, FrameIndex = i });
                        Console.WriteLine(dir + " f" + (i + 1) + " tight: " + tight.Width + "x" + tight.Height);
                    }
                }
            }
            
            // 3. Find max width and max height across all frames of this gender
            int maxW = 0, maxH = 0;
            foreach (var f in allFrames) {
                if (f.TightBmp.Width > maxW) maxW = f.TightBmp.Width;
                if (f.TightBmp.Height > maxH) maxH = f.TightBmp.Height;
            }
            
            int padX = 6;
            int padBottom = 4;
            int padTop = 4;
            int sharedFrameW = maxW + padX * 2;
            int sharedFrameH = maxH + padBottom + padTop;
            int groundY = sharedFrameH - padBottom;
            
            Console.WriteLine(">>> Shared Frame Dimensions for " + gender + ": " + sharedFrameW + " x " + sharedFrameH);
            
            // 4. Group by direction and build uniform strips
            string[] allDirs = new string[] { "idle", "walk_down", "walk_up", "walk_right" };
            foreach (string dir in allDirs) {
                List<FrameInfo> dirFrames = allFrames.FindAll(f => f.Direction == dir);
                dirFrames.Sort((a, b) => a.FrameIndex.CompareTo(b.FrameIndex));
                
                int numFrames = dirFrames.Count;
                int stripW = numFrames * sharedFrameW;
                int stripH = sharedFrameH;
                
                using (Bitmap strip = new Bitmap(stripW, stripH, PixelFormat.Format32bppArgb)) {
                    using (Graphics g = Graphics.FromImage(strip)) {
                        for (int i = 0; i < numFrames; i++) {
                            Bitmap tight = dirFrames[i].TightBmp;
                            int destX = i * sharedFrameW + (sharedFrameW - tight.Width) / 2;
                            int destY = groundY - tight.Height;
                            g.DrawImage(tight, destX, destY);
                        }
                    }
                    
                    string outFileName = gender + "_" + dir + ".png";
                    string outPath = Path.Combine(baseDir, outFileName);
                    strip.Save(outPath, ImageFormat.Png);
                    Console.WriteLine("Saved: " + outFileName + " (" + stripW + "x" + stripH + ", " + numFrames + " frames of " + sharedFrameW + "x" + sharedFrameH + ")");
                }
            }
            
            foreach (var f in allFrames) {
                f.TightBmp.Dispose();
            }
        }
    }
    
    private static Bitmap LoadWithTransparency(string path) {
        Bitmap src = new Bitmap(path);
        Bitmap res = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb);
        for (int y = 0; y < src.Height; y++) {
            for (int x = 0; x < src.Width; x++) {
                res.SetPixel(x, y, src.GetPixel(x, y));
            }
        }
        src.Dispose();
        
        Color corner = res.GetPixel(0, 0);
        if (corner.A > 200 && corner.R > 230 && corner.G > 230 && corner.B > 230) {
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
        }
        return res;
    }
    
    private static Rectangle GetBBox(Bitmap b, int startX, int startY, int width, int height) {
        int minX = int.MaxValue, minY = int.MaxValue;
        int maxX = int.MinValue, maxY = int.MinValue;
        for (int y = startY; y < startY + height; y++) {
            for (int x = startX; x < startX + width; x++) {
                if (b.GetPixel(x, y).A > 20) {
                    int lx = x - startX;
                    if (lx < minX) minX = lx;
                    if (lx > maxX) maxX = lx;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (minX > maxX) return new Rectangle(startX, startY, width, height);
        return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }
    
    private static Bitmap Crop(Bitmap b, Rectangle rect) {
        Bitmap res = new Bitmap(rect.Width, rect.Height, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(res)) {
            g.DrawImage(b, new Rectangle(0, 0, rect.Width, rect.Height), rect, GraphicsUnit.Pixel);
        }
        return res;
    }
}
"@
Add-Type -TypeDefinition $code -ReferencedAssemblies "System.Drawing"
$baseDir = Join-Path $PSScriptRoot "..\client\public\assets\characters"
[SpriteNormalizer]::NormalizeAll($baseDir)
