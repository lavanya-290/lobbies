#!/usr/bin/env python3
"""
pixelate.py - turn any image into a palette-locked pixel-art sprite.

Pipeline: (remove background) -> crop -> downscale -> build/lock palette
          -> snap colors -> hard alpha -> (outline) -> save + preview

Usage examples:
  python pixelate.py chair.png --width 48
  python pixelate.py assets/ -o sprites/ --width 64 --colors 24 --remove-bg
  python pixelate.py assets/ -o sprites/ --palette my_palette.hex --outline "#1b1b2f"

Requires: pip install pillow
"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw

METHODS = {
    "box": Image.Resampling.BOX,          # area average: best for AI "fake pixel" art
    "lanczos": Image.Resampling.LANCZOS,  # sharper, good for clean high-res art
    "nearest": Image.Resampling.NEAREST,  # blocky; best if source is already pixel art
}
EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}


def parse_hex(s):
    s = s.strip().lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def load_hex_palette(path):
    """Lospec-style .hex file: one RRGGBB color per line."""
    colors = []
    for tok in Path(path).read_text().split():
        try:
            if len(tok.lstrip("#")) == 6:
                colors.append(parse_hex(tok))
        except ValueError:
            pass
    if not colors:
        sys.exit(f"No valid colors found in {path}")
    return colors[:256]


def remove_background(im, tol):
    """Flood-fill from the four corners, making similar-colored pixels transparent."""
    im = im.copy()
    w, h = im.size
    for xy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if im.getpixel(xy)[3] > 0:
            ImageDraw.floodfill(im, xy, (0, 0, 0, 0), thresh=tol)
    return im


def prepare(path, args):
    """Load, remove bg, crop to content, downscale."""
    im = Image.open(path).convert("RGBA")
    if args.remove_bg:
        im = remove_background(im, args.bg_tol)
    bbox = im.getchannel("A").getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    if args.height:
        nh, nw = args.height, max(1, round(w * args.height / h))
    else:
        nw, nh = args.width, max(1, round(h * args.width / w))
    # Pillow premultiplies alpha when resizing RGBA, so edges don't bleed black
    return im.resize((nw, nh), METHODS[args.method])


def opaque_pixels(im, alpha_cut):
    return [p[:3] for p in im.getdata() if p[3] >= alpha_cut]


def build_palette(images, ncolors, alpha_cut):
    """Median-cut palette from the opaque pixels of ALL images (shared look)."""
    pixels = []
    for im in images:
        pixels.extend(opaque_pixels(im, alpha_cut))
    if not pixels:
        sys.exit("No opaque pixels found - is the image empty or fully removed?")
    strip = Image.new("RGB", (len(pixels), 1))
    strip.putdata(pixels)
    q = strip.quantize(colors=ncolors, method=Image.Quantize.MEDIANCUT,
                       dither=Image.Dither.NONE)
    pal = q.getpalette()
    return [tuple(pal[i * 3:i * 3 + 3]) for _, i in sorted(q.getcolors(), key=lambda c: c[1])]


def palette_image(colors):
    # Pad by repeating the last color, NOT zeros (zeros = black would attract pixels)
    padded = list(colors) + [colors[-1]] * (256 - len(colors))
    p = Image.new("P", (1, 1))
    p.putpalette([c for rgb in padded for c in rgb])
    return p


def snap(im, pal_img, alpha_cut):
    """Snap every pixel to the palette; make alpha fully on/off (no soft edges)."""
    alpha = im.getchannel("A").point(lambda a: 255 if a >= alpha_cut else 0)
    q = im.convert("RGB").quantize(palette=pal_img, dither=Image.Dither.NONE)
    out = q.convert("RGBA")
    out.putalpha(alpha)
    return out


def add_outline(im, color):
    """1px outline around the opaque shape (adds one extra color)."""
    w, h = im.size
    out = Image.new("RGBA", (w + 2, h + 2), (0, 0, 0, 0))
    out.paste(im, (1, 1))
    src = out.copy()
    sp, op = src.load(), out.load()
    for y in range(h + 2):
        for x in range(w + 2):
            if sp[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w + 2 and 0 <= ny < h + 2 and sp[nx, ny][3] > 0:
                        op[x, y] = (*color, 255)
                        break
    return out


def collect(inputs):
    files = []
    for item in inputs:
        p = Path(item)
        if p.is_dir():
            files += sorted(f for f in p.iterdir() if f.suffix.lower() in EXTS)
        elif p.is_file():
            files.append(p)
        else:
            print(f"skipping (not found): {item}")
    return files


def main():
    ap = argparse.ArgumentParser(description="Image -> palette-locked pixel sprite")
    ap.add_argument("inputs", nargs="+", help="image files and/or folders")
    ap.add_argument("-o", "--out", default="pixel_out", help="output folder")
    ap.add_argument("--width", type=int, default=64, help="sprite width in pixels")
    ap.add_argument("--height", type=int, help="sprite height in pixels (overrides width)")
    ap.add_argument("--colors", type=int, default=24, help="palette size if auto-built")
    ap.add_argument("--palette", help=".hex palette file to lock to (e.g. from Lospec)")
    ap.add_argument("--method", choices=METHODS, default="box", help="downscale method")
    ap.add_argument("--remove-bg", action="store_true", help="flood-remove corner background")
    ap.add_argument("--bg-tol", type=int, default=40, help="background color tolerance")
    ap.add_argument("--alpha-cut", type=int, default=128, help="alpha threshold 0-255")
    ap.add_argument("--outline", help='outline color, e.g. "#1b1b2f"')
    ap.add_argument("--preview", type=int, default=8, help="also save Nx upscaled preview (0=off)")
    args = ap.parse_args()

    files = collect(args.inputs)
    if not files:
        sys.exit("No input images found.")
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    sprites = [prepare(f, args) for f in files]

    if args.palette:
        colors = load_hex_palette(args.palette)
    else:
        colors = build_palette(sprites, args.colors, args.alpha_cut)
        (out_dir / "palette.hex").write_text("\n".join("%02x%02x%02x" % c for c in colors) + "\n")
    pal_img = palette_image(colors)

    outline = parse_hex(args.outline) if args.outline else None
    for f, sprite in zip(files, sprites):
        result = snap(sprite, pal_img, args.alpha_cut)
        if outline:
            result = add_outline(result, outline)
        result.save(out_dir / f"{f.stem}.png")
        if args.preview > 0:
            big = result.resize((result.width * args.preview, result.height * args.preview),
                                Image.Resampling.NEAREST)
            big.save(out_dir / f"{f.stem}_x{args.preview}.png")
        print(f"{f.name} -> {result.width}x{result.height}px, {len(colors)} colors")

    print(f"Done. Output in {out_dir}/ (palette.hex saved for reuse)" if not args.palette
          else f"Done. Output in {out_dir}/")


if __name__ == "__main__":
    main()
