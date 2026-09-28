// Tiny procedural texture toolkit for the sample-model generator: float RGBA
// canvases, fbm noise, anti-aliased strokes, height → normal maps and a PNG
// encoder. Node has no canvas, and the glTF exporter only needs pixel data.

import zlib from 'node:zlib';

// ---- deterministic randomness (models must rebuild byte-identical) ----
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Value noise tiling every periodX × periodY lattice cells, 0..1. */
export function valueNoise(x, y, periodX, periodY = periodX, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const wx = i => ((i % periodX) + periodX) % periodX, wy = i => ((i % periodY) + periodY) % periodY;
  const a = hash2(wx(xi), wy(yi), seed), b = hash2(wx(xi + 1), wy(yi), seed);
  const c = hash2(wx(xi), wy(yi + 1), seed), d = hash2(wx(xi + 1), wy(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal noise over UV (0..1), tileable. */
export function fbm(u, v, { octaves = 5, frequency = 4, seed = 0, stretch = [1, 1] } = {}) {
  let sum = 0, amp = 0.5, norm = 0, f = frequency;
  for (let o = 0; o < octaves; o++) {
    const px = Math.max(1, Math.round(f * stretch[0])), py = Math.max(1, Math.round(f * stretch[1]));
    sum += valueNoise(u * px, v * py, px, py, seed + o * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

export class Layer {
  constructor(width, height = width, fill = [0, 0, 0, 1]) {
    this.width = width;
    this.height = height;
    this.data = new Float32Array(width * height * 4);
    for (let i = 0; i < width * height; i++) this.data.set(fill, i * 4);
  }

  /** fn(u, v, x, y) → [r, g, b, a?] for every pixel. */
  paint(fn) {
    const { width, height, data } = this;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const out = fn((x + 0.5) / width, (y + 0.5) / height, x, y, this.get(x, y));
      if (out) data.set(out.length === 4 ? out : [...out, data[(y * width + x) * 4 + 3]], (y * width + x) * 4);
    }
    return this;
  }

  get(x, y) {
    const { width, height, data } = this;
    const xi = ((x % width) + width) % width, yi = ((y % height) + height) % height;
    const i = (yi * width + xi) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  }

  /**
   * Anti-aliased thick polyline in UV space. `blend(existing, coverage)` returns the
   * new pixel — lets one stroke primitive serve albedo, height and emissive layers.
   */
  stroke(points, radius, blend) {
    const { width, height, data } = this;
    const r = radius * width;
    for (let s = 0; s < points.length - 1; s++) {
      const [ax, ay] = [points[s][0] * width, points[s][1] * height];
      const [bx, by] = [points[s + 1][0] * width, points[s + 1][1] * height];
      const minX = Math.floor(Math.min(ax, bx) - r - 1), maxX = Math.ceil(Math.max(ax, bx) + r + 1);
      const minY = Math.floor(Math.min(ay, by) - r - 1), maxY = Math.ceil(Math.max(ay, by) + r + 1);
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const px = x + 0.5, py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
        const coverage = Math.max(0, Math.min(1, r - d + 0.5));
        if (coverage <= 0) continue;
        const i = (y * width + x) * 4;
        data.set(blend([data[i], data[i + 1], data[i + 2], data[i + 3]], coverage), i);
      }
    }
    return this;
  }

  /** Separable box blur (repeat for a cheap gaussian). */
  blur(radius = 1, passes = 2) {
    const { width, height } = this;
    for (let p = 0; p < passes; p++) {
      for (const horizontal of [true, false]) {
        const src = this.data.slice();
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const acc = [0, 0, 0, 0];
          for (let k = -radius; k <= radius; k++) {
            const sx = horizontal ? Math.min(width - 1, Math.max(0, x + k)) : x;
            const sy = horizontal ? y : Math.min(height - 1, Math.max(0, y + k));
            const i = (sy * width + sx) * 4;
            for (let c = 0; c < 4; c++) acc[c] += src[i + c];
          }
          this.data.set(acc.map(a => a / (radius * 2 + 1)), (y * width + x) * 4);
        }
      }
    }
    return this;
  }

  /** Treats channel 0 as height and returns a tangent-space normal map. */
  toNormalMap(strength = 2) {
    const out = new Layer(this.width, this.height);
    return out.paint((u, v, x, y) => {
      const hL = this.get(x - 1, y)[0], hR = this.get(x + 1, y)[0];
      const hD = this.get(x, y + 1)[0], hU = this.get(x, y - 1)[0];
      const nx = (hL - hR) * strength, ny = (hD - hU) * strength, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      return [nx / l * 0.5 + 0.5, ny / l * 0.5 + 0.5, nz / l * 0.5 + 0.5, 1];
    });
  }

  toBytes() {
    const out = new Uint8ClampedArray(this.width * this.height * 4);
    for (let i = 0; i < out.length; i++) out[i] = Math.round(Math.max(0, Math.min(1, this.data[i])) * 255);
    return out;
  }
}

// ---- helpers for common surface details ----
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const clamp01 = v => Math.max(0, Math.min(1, v));
export const smoothstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Random scratch polylines (UV space), mostly aligned with `angle`. */
export function scratches(random, count, { angle = Math.PI / 2, spread = 0.5, length = [0.03, 0.2] } = {}) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const a = angle + (random() - 0.5) * spread * Math.PI;
    const len = length[0] + random() * (length[1] - length[0]);
    const x = random(), y = random();
    const bend = (random() - 0.5) * 0.3;
    lines.push([[x, y], [x + Math.cos(a + bend) * len * 0.5, y + Math.sin(a + bend) * len * 0.5], [x + Math.cos(a) * len, y + Math.sin(a) * len]]);
  }
  return lines;
}

/** Procedural rune glyph: 2–4 angular strokes inside a unit cell, deterministic per seed. */
export function glyph(random) {
  const strokes = [];
  const n = 2 + Math.floor(random() * 3);
  const snap = () => [0.15 + Math.floor(random() * 3) * 0.35, 0.1 + Math.floor(random() * 4) * 0.27];
  for (let i = 0; i < n; i++) {
    const pts = [snap(), snap()];
    if (random() < 0.6) pts.push(snap());
    strokes.push(pts);
  }
  // A hook or curl on some glyphs so they read as script, not tally marks.
  if (random() < 0.5) {
    const cx = 0.3 + random() * 0.4, cy = 0.3 + random() * 0.4, r = 0.18;
    const start = random() * Math.PI * 2;
    strokes.push(Array.from({ length: 7 }, (_, k) => [cx + Math.cos(start + k * 0.6) * r, cy + Math.sin(start + k * 0.6) * r]));
  }
  return strokes;
}

// ---- PNG encoding ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
/** RGBA8 pixels → PNG bytes (drops alpha when fully opaque, to save space). */
export function encodePng(width, height, rgba) {
  let opaque = true;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) { opaque = false; break; }
  const channels = opaque ? 3 : 4;
  const raw = Buffer.alloc((width * channels + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * channels + 1);
    raw[row] = 1; // "Sub" filter: much smaller output for smooth gradients
    for (let x = 0; x < width; x++) for (let c = 0; c < channels; c++) {
      const value = rgba[(y * width + x) * 4 + c];
      const left = x > 0 ? rgba[(y * width + x - 1) * 4 + c] : 0;
      raw[row + 1 + x * channels + c] = (value - left) & 0xff;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = opaque ? 2 : 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Minimal OffscreenCanvas/ImageData so three's GLTFExporter can embed
 * DataTextures as PNG when run in Node.
 */
export function installCanvasShim() {
  globalThis.ImageData ??= class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
  globalThis.OffscreenCanvas ??= class {
    constructor(width, height) { this.width = width; this.height = height; this.image = null; }
    getContext() {
      const canvas = this;
      return { translate() {}, scale() {}, putImageData(image) { canvas.image = image; } };
    }
    convertToBlob() {
      const { width, height, image } = this;
      return Promise.resolve(new Blob([encodePng(width, height, image.data)], { type: 'image/png' }));
    }
  };
}
