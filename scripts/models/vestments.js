// Priest/mage ("robe" type) armour and the sigil off-hand, in the white-and-gold
// "celestial cleric" style of the concept sheets:
//   embroideredMantle() (armor/robe)  goldBracers() (gloves/robe)
//   charmAnklets() (boots/robe)       legWraps() (greaves/robe)
//   runeSigil() (shield/sigill)

import * as THREE from 'three';
import { Layer, clamp01, fbm, glyph, mix, rng } from './texture.js';
import { leatherWrapMaps, texturedMaterial } from './weapons.js';
import { chainAlong, crystal, enamel, extrude, faceted, gold, merged, mesh, scroll, silver, teardrop } from './jewelry.js';
import { taperedTube } from './arsenal.js';

const lerp = (a, b, t) => a + (b - a) * t;
const trim = (points, radius = 0.018) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(16, points.length * 2), radius, 8, false);

/**
 * Woven cloth with metallic gold embroidery. `embroider(u, v)` returns 0..1
 * coverage; embroidered texels become gold and metallic so they catch the
 * environment while the cloth around them stays matte.
 */
function embroideredCloth(width, height, seed, { base = [0.88, 0.86, 0.93], embroider }) {
  const weave = (u, v) => 0.5 + 0.5 * Math.sin(u * width * 1.6) * Math.sin(v * height * 1.6);
  const coverage = new Layer(width, height).paint((u, v) => [clamp01(embroider(u, v)), 0, 0, 1]);
  const heightMap = new Layer(width, height).paint((u, v, x, y) => [0.45 + weave(u, v) * 0.12 + fbm(u, v, { frequency: 6, seed }) * 0.12 + coverage.get(x, y)[0] * 0.3, 0, 0, 1]);
  const albedo = new Layer(width, height).paint((u, v, x, y) => {
    const c = coverage.get(x, y)[0];
    const shade = 0.9 + weave(u, v) * 0.1;
    return [...mix(base.map(ch => ch * shade), [0.86, 0.66, 0.3], c), 1];
  });
  const rough = new Layer(width, height).paint((u, v, x, y) => [lerp(0.82, 0.32, coverage.get(x, y)[0]), 0, 0, 1]);
  const metal = new Layer(width, height).paint((u, v, x, y) => [coverage.get(x, y)[0] * 0.9, 0, 0, 1]);
  return { albedo, rough, metal, height: heightMap };
}

/** Scroll-and-glyph embroidery band painter for embroideredCloth. */
function bandPattern(seed, bands) {
  const r = rng(seed);
  const layer = new Layer(256, 256, [0, 0, 0, 1]);
  for (const { v0, v1, u0 = 0, u1 = 1, vertical = false } of bands) {
    // Border lines.
    for (const e of vertical ? [u0, u1] : [v0, v1]) {
      const line = vertical ? [[e, v0], [e, v1]] : [[u0, e], [u1, e]];
      layer.stroke(line, 0.004, (px, c) => [Math.max(px[0], c), 0, 0, 1]);
    }
    // Repeating glyph motif between the border lines.
    const steps = vertical ? 10 : 18;
    for (let k = 0; k < steps; k++) {
      const strokes = glyph(r);
      for (const s of strokes) {
        const pts = s.map(([x, y]) => vertical
          ? [u0 + (u1 - u0) * (0.15 + x * 0.7), v0 + (v1 - v0) * ((k + 0.1 + y * 0.8) / steps)]
          : [u0 + (u1 - u0) * ((k + 0.1 + x * 0.8) / steps), v0 + (v1 - v0) * (0.15 + y * 0.7)]);
        layer.stroke(pts, 0.0035, (px, c) => [Math.max(px[0], c), 0, 0, 1]);
      }
    }
  }
  return (u, v) => layer.get(Math.floor(u * 255.999), Math.floor(v * 255.999))[0];
}

/** Robe surface: flared shell with folds that deepen toward the hem. */
function robeSurface({ y0, y1, a0, a1, width, depth, folds = 9, foldDepth = 0.06, segU = 64, segV = 40 }) {
  const positions = [], uvs = [], indices = [];
  for (let j = 0; j <= segV; j++) for (let i = 0; i <= segU; i++) {
    const u = i / segU, v = j / segV, a = a0 + u * (a1 - a0), y = y0 + v * (y1 - y0);
    const hem = 1 - v; // v = 0 at the hem
    const fold = 1 + Math.sin(a * folds) * foldDepth * hem * hem;
    positions.push(width(y) * fold * Math.sin(a), y, depth(y) * fold * Math.cos(a));
    uvs.push(u, v);
  }
  for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
    const a = j * (segU + 1) + i, b = a + 1, c = a + segU + 1, d = c + 1;
    indices.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------

export function embroideredMantle() {
  const group = new THREE.Group();
  group.name = 'embroideredMantle';
  const width = y => (y > 0.35 ? lerp(0.42, 0.5, (y - 0.35) / 0.4) : y > 0 ? lerp(0.36, 0.42, y / 0.35) : lerp(0.72, 0.36, (y + 1.1) / 1.1));
  const depth = y => (y > 0 ? 0.3 : lerp(0.52, 0.3, (y + 1.1) / 1.1));
  const embroider = bandPattern(3, [{ v0: 0.03, v1: 0.12 }, { v0: 0.12, v1: 0.95, u0: 0.47, u1: 0.53, vertical: true }]);
  const cloth = texturedMaterial('mantleCloth', embroideredCloth(256, 256, 11, { embroider }), { normalStrength: 2 });
  cloth.side = THREE.DoubleSide;
  // Front panel and back panel, with a slit opening at the front hem.
  const body = robeSurface({ y0: -1.1, y1: 0.75, a0: -Math.PI * 0.97, a1: Math.PI * 0.97, width, depth });
  group.add(mesh(body, cloth, 'robe'));
  // Short capelet over the shoulders.
  const cape = robeSurface({ y0: 0.35, y1: 0.8, a0: -Math.PI, a1: Math.PI, width: y => lerp(0.62, 0.34, (y - 0.35) / 0.45), depth: y => lerp(0.46, 0.26, (y - 0.35) / 0.45), folds: 12, foldDepth: 0.08, segU: 64, segV: 12 });
  const capeCloth = texturedMaterial('capeCloth', embroideredCloth(256, 128, 21, { base: [0.46, 0.3, 0.66], embroider: bandPattern(9, [{ v0: 0.04, v1: 0.2 }]) }), { normalStrength: 2 });
  capeCloth.side = THREE.DoubleSide;
  group.add(mesh(cape, capeCloth, 'capelet'));
  // Gold trims: collar, capelet hem, sash; sun clasp with a crystal.
  const ring = (y, w, d, n = 64) => Array.from({ length: n + 1 }, (_, k) => { const a = -Math.PI + (k / n) * Math.PI * 2; return new THREE.Vector3(Math.sin(a) * w, y, Math.cos(a) * d); });
  const trims = [trim(ring(0.8, 0.34, 0.26), 0.028), trim(ring(0.02, 0.37, 0.31), 0.03), trim(ring(-0.02, 0.37, 0.31), 0.018)];
  const clasp = new THREE.TorusGeometry(0.08, 0.018, 10, 36);
  clasp.translate(0, 0.62, 0.33);
  const filigree = [-1, 1].map(side => scroll(new THREE.Vector3(side * 0.12, 0.62, 0.31), { radius: 0.08, turns: 1.2, angle: side > 0 ? 0 : Math.PI, flip: side, thickness: 0.011 }));
  group.add(merged([...trims, clasp, ...filigree], gold(), 'goldTrim'));
  const gem = new THREE.OctahedronGeometry(0.06, 0);
  gem.scale(1, 1.2, 0.6);
  gem.translate(0, 0.62, 0.35);
  group.add(mesh(faceted(gem), crystal(0x9fd4ff, { glow: 2 }), 'claspGem'));
  return group;
}

export function goldBracers() {
  const group = new THREE.Group();
  group.name = 'goldBracers';
  const bodies = [], ornament = [], gems = [];
  for (const side of [-1, 1]) {
    const x = side * 0.28;
    const bracer = new THREE.LatheGeometry([[0.14, -0.3], [0.16, -0.26], [0.15, 0], [0.17, 0.26], [0.19, 0.3]].map(([r, y]) => new THREE.Vector2(r, y)), 48);
    bracer.translate(x, 0, 0);
    bodies.push(bracer);
    for (const y of [-0.28, 0.28]) { const t = new THREE.TorusGeometry(y > 0 ? 0.19 : 0.16, 0.018, 10, 48); t.rotateX(Math.PI / 2); t.translate(x, y, 0); ornament.push(t); }
    for (const [dy, flip] of [[0.1, 1], [-0.1, -1]]) ornament.push(scroll(new THREE.Vector3(x, dy, 0.165), { radius: 0.07, turns: 1.2, angle: flip > 0 ? 0 : Math.PI, flip, thickness: 0.011 }));
    const g = new THREE.OctahedronGeometry(0.05, 0);
    g.scale(0.9, 1.3, 0.6);
    g.translate(x, 0, 0.19);
    gems.push(faceted(g));
  }
  // White enamel with gold trim, matching the mantle's cleric palette.
  group.add(merged(bodies, enamel(0xf2ede6), 'bracers'));
  group.add(merged(ornament, gold(), 'ornament'));
  group.add(merged(gems, crystal(0x9fd4ff, { glow: 1.8 }), 'gems'));
  return group;
}

export function charmAnklets() {
  const group = new THREE.Group();
  group.name = 'charmAnklets';
  const bands = [], chains = [], charms = [], bells = [];
  for (const side of [-1, 1]) {
    const x = side * 0.34;
    const band = new THREE.TorusGeometry(0.24, 0.025, 12, 72);
    band.rotateX(Math.PI / 2 - 0.35);
    band.translate(x, 0, 0);
    bands.push(band);
    const inner = new THREE.TorusGeometry(0.24, 0.012, 8, 72);
    inner.rotateX(Math.PI / 2 - 0.35);
    inner.translate(x, 0.05, 0);
    bands.push(inner);
    // Five dangling charms across the front of the band.
    for (let k = 0; k < 5; k++) {
      const a = -0.9 + (k / 4) * 1.8;
      const top = new THREE.Vector3(x + Math.sin(a) * 0.24, -Math.cos(a) * 0.24 * Math.sin(0.35) * -1 - 0.01, Math.cos(a) * 0.24 * Math.cos(0.35));
      const len = k === 2 ? 0.2 : 0.12;
      const bottom = top.clone().add(new THREE.Vector3(0, -len, 0));
      chains.push(...chainAlong(new THREE.LineCurve3(top, bottom), Math.max(2, Math.round(len / 0.03)), 0.01, 0.0035));
      if (k % 2 === 0) { const d = teardrop(k === 2 ? 0.04 : 0.028, 16); d.translate(bottom.x, bottom.y, bottom.z); charms.push(d); }
      else { const b = new THREE.SphereGeometry(0.03, 16, 12); b.translate(bottom.x, bottom.y - 0.02, bottom.z); bells.push(b); }
    }
  }
  group.add(merged([...bands, ...chains], gold(), 'bands'));
  group.add(merged(bells, silver(), 'bells'));
  group.add(merged(charms, crystal(0xb5a2ff, { glow: 1.6 }), 'charms'));
  return group;
}

export function legWraps() {
  const group = new THREE.Group();
  group.name = 'legWraps';
  const wrapMat = texturedMaterial('wrapCloth', leatherWrapMaps(128, 256, 33, [0.82, 0.78, 0.86], 12), { normalStrength: 4 });
  wrapMat.metalness = 0;
  const legs = [], bands = [], ribbons = [];
  for (const side of [-1, 1]) {
    const x = side * 0.22;
    const leg = new THREE.LatheGeometry([[0.1, -0.9], [0.12, -0.7], [0.13, -0.35], [0.12, -0.15], [0.14, 0.2], [0.17, 0.6], [0.18, 0.75]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
    leg.translate(x, 0, 0);
    legs.push(leg);
    for (const [y, r] of [[-0.88, 0.105], [-0.15, 0.125], [0.73, 0.182]]) { const t = new THREE.TorusGeometry(r, 0.018, 10, 44); t.rotateX(Math.PI / 2); t.translate(x, y, 0); bands.push(t); }
    // Loose ribbon end fluttering from the knee band.
    const pts = [[0, -0.15], [0.12, -0.3], [0.1, -0.5], [0.2, -0.68]].map(([dx, y]) => new THREE.Vector3(x + side * dx + side * 0.12, y, 0.06));
    ribbons.push(taperedTube(pts, 0.03, 0.012, { thin: 0.35, radial: 8, tubular: 32 }));
  }
  group.add(merged(legs, wrapMat, 'wraps'));
  group.add(merged(bands, gold(), 'bands'));
  const ribbonMat = new THREE.MeshStandardMaterial({ name: 'ribbon', color: 0x6a4a9c, roughness: 0.6, side: THREE.DoubleSide });
  group.add(merged(ribbons, ribbonMat, 'ribbons'));
  return group;
}

export function runeSigil() {
  const group = new THREE.Group();
  group.name = 'runeSigil';
  const outer = new THREE.TorusGeometry(0.7, 0.035, 16, 128);
  const inner = new THREE.TorusGeometry(0.5, 0.02, 12, 96);
  // Eight-point star.
  const star = new THREE.Shape();
  for (let k = 0; k <= 16; k++) { const a = (k / 16) * Math.PI * 2 + Math.PI / 2, r = k % 2 ? 0.2 : 0.46, p = [Math.cos(a) * r, Math.sin(a) * r]; if (k === 0) star.moveTo(...p); else star.lineTo(...p); }
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.12, 0, Math.PI * 2, true);
  star.holes.push(hole);
  const starGeo = extrude(star, 0.03, 0.015, 2);
  group.add(merged([outer, inner], gold(), 'rings'));
  group.add(mesh(starGeo, silver(), 'star'));
  // Glowing runes between the two rings.
  const r = rng(77), runes = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, cx = Math.cos(a) * 0.6, cy = Math.sin(a) * 0.6;
    for (const s of glyph(r)) {
      const pts = s.map(([x, y]) => { const lx = (x - 0.5) * 0.12, ly = (y - 0.5) * 0.12; return new THREE.Vector3(cx + lx * Math.cos(a + Math.PI / 2) - ly * Math.sin(a + Math.PI / 2) * -1, cy + lx * Math.sin(a + Math.PI / 2) + ly * Math.cos(a + Math.PI / 2), 0.02); });
      if (pts.length > 1) runes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8 * pts.length, 0.008, 5, false));
    }
  }
  group.add(merged(runes, crystal(0x8fd8ff, { glow: 2.2 }), 'runes'));
  // Centre crystal and four orbiting gems.
  const core = new THREE.OctahedronGeometry(0.11, 0);
  core.scale(0.8, 1.4, 0.8);
  group.add(mesh(faceted(core), crystal(0xbfe8ff, { glow: 2.6 }), 'core'));
  const orbiters = [0, 1, 2, 3].map(k => { const a = (k / 4) * Math.PI * 2 + Math.PI / 4, g = new THREE.SphereGeometry(0.045, 16, 12); g.translate(Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0); return g; });
  group.add(merged(orbiters, crystal(0x9fb6ff, { glow: 1.6 }), 'orbiters'));
  return group;
}
