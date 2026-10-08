const fs = require('fs');
const zlib = require('zlib');

// Create a 28x28 pixel art arrow cursor
// Outlined in cyan (#4fd8e0), body in dark navy (#0e1620), accent line in pale cyan (#dffcff)
const W = 28;
const H = 28;
const pixels = new Uint8Array(W * H * 4);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const idx = (y * W + x) * 4;
  pixels[idx] = r;
  pixels[idx + 1] = g;
  pixels[idx + 2] = b;
  pixels[idx + 3] = a;
}

// Pixel map for classic isometric/retro pointer cursor scaled to 28x28 (tip at 0,0)
const CYAN = [79, 216, 224, 255];
const DARK_NAVY = [14, 22, 32, 255];
const DARK_CYAN = [31, 122, 130, 255];
const PALE_CYAN = [223, 252, 255, 255];

const cursorPattern = [
  "XX                          ",
  "X.X                         ",
  "X..X                        ",
  "X...X                       ",
  "X.o..X                      ",
  "X.oo..X                     ",
  "X.ooo..X                    ",
  "X.oooo..X                   ",
  "X.ooooo..X                  ",
  "X.oooooo..X                 ",
  "X.ooooooo..X                ",
  "X.oooooooo..X               ",
  "X.ooooooooo..X              ",
  "X.oooooooooo..X             ",
  "X.oooooXXXXXXX              ",
  "X.ooooX#X                   ",
  "X.oo.oX##X                  ",
  "X.oX X.X##X                 ",
  "XX   X.X##X                 ",
  "X     X.X##X                ",
  "      X.X##X                ",
  "       X.X##X               ",
  "       X.X##X               ",
  "        X.X#X               ",
  "        XXXXX               ",
  "                            ",
  "                            ",
  "                            ",
];

for (let y = 0; y < H; y++) {
  const row = cursorPattern[y] || "";
  for (let x = 0; x < W; x++) {
    const char = row[x] || " ";
    if (char === "X") {
      setPixel(x, y, CYAN[0], CYAN[1], CYAN[2], 255);
    } else if (char === "o") {
      setPixel(x, y, DARK_NAVY[0], DARK_NAVY[1], DARK_NAVY[2], 255);
    } else if (char === ".") {
      setPixel(x, y, PALE_CYAN[0], PALE_CYAN[1], PALE_CYAN[2], 255);
    } else if (char === "#") {
      setPixel(x, y, DARK_CYAN[0], DARK_CYAN[1], DARK_CYAN[2], 255);
    }
  }
}

// Encode to PNG
function createPng(width, height, rgba) {
  // raw scanlines with filter byte 0
  const raw = Buffer.alloc(height * (1 + width * 4));
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      raw[p++] = rgba[idx];
      raw[p++] = rgba[idx + 1];
      raw[p++] = rgba[idx + 2];
      raw[p++] = rgba[idx + 3];
    }
  }

  const compressed = zlib.deflateSync(raw);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    const payload = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(payload), 0);
    return Buffer.concat([lenBuf, payload, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const pngBuf = createPng(W, H, pixels);
const outPath = 'client/public/assets/cursor/pointer.png';
fs.writeFileSync(outPath, pngBuf);
console.log(`Saved pixel cursor to ${outPath} (${pngBuf.length} bytes)`);
