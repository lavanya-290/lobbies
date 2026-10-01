$csharpCode = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public class BBoxAnalyzer {
    public static void Analyze(string femaleJpg, string maleJpg) {
        CheckOne(femaleJpg, "Female Raw");
        CheckOne(maleJpg, "Male Raw");
    }
    
    private static void CheckOne(string path, string label) {
        using (Bitmap bmp = new Bitmap(path)) {
            int w = bmp.Width, h = bmp.Height;
            int minX = w, maxX = 0, minY = h, maxY = 0;
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    Color c = bmp.GetPixel(x, y);
                    // Check non-white
                    if (c.R < 240 || c.G < 240 || c.B < 240) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            Console.WriteLine(string.Format("{0}: Content={1}x{2}, X=[{3}, {4}], Y=[{5}, {6}]", 
                label, (maxX - minX + 1), (maxY - minY + 1), minX, maxX, minY, maxY));
        }
    }
}
'@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing
[BBoxAnalyzer]::Analyze(
    "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\base_female_idle_1790575905448.jpg",
    "C:\Users\lavanya.singh\.gemini\antigravity-ide\brain\929ea65a-5f6d-4485-9f7e-0d60723dd9fe\base_male_idle_1790575926496.jpg"
)
