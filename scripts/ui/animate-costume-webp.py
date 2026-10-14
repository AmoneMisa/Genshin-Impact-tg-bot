"""Build a looping animated WebP from a static costume painting.

Effects: breathing, hem/skirt sway (feet stay planted), pulsing glow on the
bright/saturated parts, and optional blink when eye points are supplied.
Usage: animate-costume-webp.py SRC.webp OUT.webp [--eyes x,y,x,y] [--frames 24] [--fps 12]
"""
import argparse, math
import numpy as np
from PIL import Image, ImageFilter

p = argparse.ArgumentParser()
p.add_argument('src'); p.add_argument('out')
p.add_argument('--frames', type=int, default=24)
p.add_argument('--fps', type=int, default=12)
p.add_argument('--eyes', help='lx,ly,rx,ry in source pixels')
p.add_argument('--quality', type=int, default=72)
a = p.parse_args()

src = Image.open(a.src).convert('RGBA')
W, H = src.size
arr = np.asarray(src).astype(np.float32)
alpha = arr[..., 3]
ys, xs = np.nonzero(alpha > 20)
top, bottom = ys.min(), ys.max()
cx = (xs.min() + xs.max()) / 2

# glow mask: bright and saturated pixels, blurred
rgb = arr[..., :3] / 255
mx, mn = rgb.max(-1), rgb.min(-1)
sat = (mx - mn) / (mx + 1e-4)
glow_m = np.clip((mx - 0.62) * 3.2, 0, 1) * np.clip(sat * 1.6, 0, 1) * (alpha / 255)
gm = Image.fromarray((glow_m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(W / 64))
glow_soft = np.asarray(gm).astype(np.float32) / 255
glow_col = np.clip(rgb * 1.25 + 0.08, 0, 1)

rows = np.arange(H, dtype=np.float32)
rel = np.clip((rows - top) / max(bottom - top, 1), 0, 1)       # 0 head .. 1 feet
cols = np.arange(W, dtype=np.float32)
n = a.frames
frames = []
for i in range(n):
    t = 2 * math.pi * i / n
    # per-row horizontal shift: grows toward the hem, phase lag gives a wave
    amp = (W * 0.006) * (rel ** 1.6) + (W * 0.0025)
    shift = amp * np.sin(t - rel * 2.2)
    # breathing: tiny vertical stretch of torso anchored at the feet
    breath = 1 + 0.004 * math.sin(t)
    ysrc = bottom - (bottom - rows) / breath
    ysrc = np.clip(ysrc, 0, H - 1)
    y0 = np.floor(ysrc).astype(int); y1 = np.minimum(y0 + 1, H - 1); fy = (ysrc - y0)[:, None, None]
    base = arr[y0] * (1 - fy) + arr[y1] * fy
    base_glow = glow_soft[y0] * (1 - fy[..., 0]) + glow_soft[y1] * fy[..., 0]
    # horizontal resample per row
    xsrc = cols[None, :] - shift[:, None]
    x0 = np.clip(np.floor(xsrc).astype(int), 0, W - 2); fx = np.clip(xsrc - x0, 0, 1)[..., None]
    ri = np.arange(H)[:, None]
    out = base[ri, x0] * (1 - fx) + base[ri, x0 + 1] * fx
    g = base_glow[ri, x0] * (1 - fx[..., 0]) + base_glow[ri, x0 + 1] * fx[..., 0]
    pulse = 0.5 + 0.5 * math.sin(t - 0.8)
    k = (0.10 + 0.32 * pulse) * g[..., None]
    out[..., :3] = np.clip(out[..., :3] * (1 + k) + k * 90, 0, 255)
    im = Image.fromarray(out.astype(np.uint8), 'RGBA')
    if a.eyes and i in (n // 2, n // 2 + 1):
        lx, ly, rx, ry = [float(v) for v in a.eyes.split(',')]
        from PIL import ImageDraw
        d = ImageDraw.Draw(im)
        r = W * 0.011
        for ex, ey in ((lx, ly), (rx, ry)):
            skin = im.getpixel((int(ex), int(ey - r * 2.2)))
            d.ellipse([ex - r * 1.5, ey - r * 0.7, ex + r * 1.5, ey + r * 0.7], fill=skin)
            d.line([ex - r * 1.4, ey, ex + r * 1.4, ey], fill=(70, 30, 25, 255), width=max(1, round(W / 400)))
    frames.append(im)

frames[0].save(a.out, save_all=True, append_images=frames[1:], duration=round(1000 / a.fps),
               loop=0, quality=a.quality, method=4, lossless=False, minimize_size=True)
import os
print(a.out, n, 'frames', os.path.getsize(a.out) // 1024, 'KB')
