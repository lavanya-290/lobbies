const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

async function run() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1200 });

  const imgPath = path.resolve(__dirname, "../client/public/assets/scenes/lobby_background.png");
  const base64 = fs.readFileSync(imgPath).toString("base64");

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; background:#000;">
      <canvas id="c" width="1448" height="1086"></canvas>
      <script>
        const img = new Image();
        img.src = "data:image/png;base64,${base64}";
        img.onload = () => {
          const ctx = document.getElementById('c').getContext('2d');
          ctx.drawImage(img, 0, 0);
          window.__READY__ = true;
        };
      </script>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForFunction(() => window.__READY__);

  await page.evaluate(() => {
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');

    // Refined Walkable Floor Polygon in 1448 x 1086 image space:
    // Follows the inner walkable floor tiles, keeping inside perimeter planters, benches, and outer ledge:
    const floorPoly = [
      { x: 720, y: 185 },  // Top corner (in front of back wall/planters)
      { x: 1270, y: 495 }, // Right corner (inside back-right wall & front-right planter)
      { x: 765, y: 805 },  // Bottom corner (inside lower perimeter ledge & lampposts)
      { x: 135, y: 485 },  // Left corner (inside lower-left perimeter planter)
      { x: 310, y: 385 },  // Approaching door landing
      { x: 360, y: 350 },  // Front of door threshold
      { x: 440, y: 335 },  // Front of kiosk terminal
      { x: 505, y: 320 },  // Clear of kiosk, back onto main floor
    ];

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#00ffcc';
    ctx.fillStyle = 'rgba(0, 255, 200, 0.22)';
    ctx.beginPath();
    floorPoly.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    // Hotspot 1: Glowing Pink Door
    // Spans the full portal structure
    const doorRect = { x: 180, y: 105, w: 245, h: 265 };
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff00aa';
    ctx.fillStyle = 'rgba(255, 0, 170, 0.3)';
    ctx.strokeRect(doorRect.x, doorRect.y, doorRect.w, doorRect.h);
    ctx.fillRect(doorRect.x, doorRect.y, doorRect.w, doorRect.h);

    // Hotspot 2: Kiosk Terminal
    // Small angled screen and pedestal
    const kioskRect = { x: 435, y: 245, w: 70, h: 105 };
    ctx.strokeStyle = '#ffff00';
    ctx.fillStyle = 'rgba(255, 255, 0, 0.35)';
    ctx.strokeRect(kioskRect.x, kioskRect.y, kioskRect.w, kioskRect.h);
    ctx.fillRect(kioskRect.x, kioskRect.y, kioskRect.w, kioskRect.h);

    // Spawn Point: Center-front of walkable floor
    const spawnPt = { x: 750, y: 640 };
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(spawnPt.x, spawnPt.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  const artifactPath = path.join(
    "C:\\Users\\lavanya.singh\\.gemini\\antigravity-ide\\brain\\929ea65a-5f6d-4485-9f7e-0d60723dd9fe",
    "lobby_hotspots_overlay.png"
  );
  await page.screenshot({ path: artifactPath });
  console.log("Saved refined test overlay to:", artifactPath);

  await browser.close();
}

run().catch(console.error);
