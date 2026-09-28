// Plate-armour samples in a "dark paladin" style — blackened steel, gold trim,
// a glowing sun emblem — after the armour concept sheets:
//   greatHelm()  (helmet)   sunCuirass() (armor)   plateGauntlets() (gloves)
//   plateGreaves() (greaves) sabatons() (boots)
//
// Plates are parametric shells with real thickness; every rim gets a gold trim
// tube, which is both the paladin look and what hides the shell's cut edges.

import * as THREE from 'three';
import { Layer, fbm, rng, scratches } from './texture.js';
import { texturedMaterial } from './weapons.js';
import { crystal, extrude, faceted, gold, merged, mesh, scroll } from './jewelry.js';

function blackSteelMaps(size, seed) {
  const r = rng(seed);
  const height = new Layer(size).paint((u, v) => [0.6 + (fbm(u, v, { frequency: 5, seed }) - 0.5) * 0.22, 0, 0, 1]);
  for (const line of scratches(r, 45, { angle: r() * Math.PI, spread: 1, length: [0.02, 0.12] })) height.stroke(line, 0.0014, (px, c) => [px[0] - 0.1 * c, 0, 0, 1]);
  const albedo = new Layer(size).paint((u, v, x, y) => { const h = height.get(x, y)[0]; const k = 0.8 + (h - 0.6) * 1.2; return [0.13 * k, 0.14 * k, 0.17 * k, 1]; });
  const rough = new Layer(size).paint((u, v, x, y) => [0.2 + (0.62 - height.get(x, y)[0]) * 0.7, 0, 0, 1]);
  const metal = new Layer(size, size, [1, 1, 1, 1]);
  return { albedo, rough, metal, height };
}

let steelMaterial = null;
const blackSteel = () => (steelMaterial ??= texturedMaterial('blackSteel', blackSteelMaps(128, 7)));
const darkCloth = () => new THREE.MeshStandardMaterial({ name: 'cloth', color: 0x1a1522, roughness: 0.85, metalness: 0 });

/**
 * Curved plate: P(u, v) = (width(y)·sin a, y, depth(y)·cos a + zOffset(y)),
 * a ∈ [a0, a1], y ∈ [y0, y1]. Built as an outer and an inner surface
 * `thickness` apart; returns the geometry plus the four rim curves for trim.
 */
export function shell({ y0, y1, a0 = -Math.PI / 2, a1 = Math.PI / 2, width, depth, zOffset = () => 0, thickness = 0.03, segU = 36, segV = 24 }) {
  const point = (u, v, inset) => {
    const a = a0 + u * (a1 - a0), y = y0 + v * (y1 - y0);
    const w = width(y) - inset, d = depth(y) - inset;
    return new THREE.Vector3(w * Math.sin(a), y, d * Math.cos(a) + zOffset(y));
  };
  const positions = [], uvs = [], indices = [];
  for (const [inset, flip] of [[0, false], [thickness, true]]) {
    const base = positions.length / 3;
    for (let j = 0; j <= segV; j++) for (let i = 0; i <= segU; i++) {
      const p = point(i / segU, j / segV, inset);
      positions.push(p.x, p.y, p.z);
      uvs.push(i / segU, j / segV);
    }
    for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
      const a = base + j * (segU + 1) + i, b = a + 1, c = a + segU + 1, d = c + 1;
      if (flip) indices.push(a, c, b, b, c, d); else indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Make sure the outer surface faces outward (away from the shell's axis).
  const n = geometry.attributes.normal, mid = Math.floor(segV / 2) * (segU + 1) + Math.floor(segU / 2);
  const outward = point(0.5, 0.5, 0).clone().setY(0).sub(new THREE.Vector3(0, 0, zOffset(y0 + (y1 - y0) / 2)));
  if (n.getX(mid) * outward.x + n.getZ(mid) * outward.z < 0) {
    const idx = geometry.index.array;
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    geometry.computeVertexNormals();
  }
  const edge = (fn, count = 40) => Array.from({ length: count + 1 }, (_, k) => fn(k / count));
  const rims = [
    edge(u => point(u, 0, thickness / 2)), edge(u => point(u, 1, thickness / 2)),
    edge(v => point(0, v, thickness / 2)), edge(v => point(1, v, thickness / 2)),
  ];
  return { geometry, rims };
}

const trim = (points, radius = 0.018) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(16, points.length * 2), radius, 8, false);
const lerp = (a, b, t) => a + (b - a) * t;

function sunEmblem(radius, z, y = 0) {
  const ring = new THREE.TorusGeometry(radius, radius * 0.1, 10, 48);
  const rays = new THREE.Shape();
  for (let k = 0; k <= 16; k++) {
    const a = (k / 16) * Math.PI * 2, r = k % 2 ? radius * 1.05 : radius * 1.6;
    const p = [Math.cos(a) * r, Math.sin(a) * r];
    if (k === 0) rays.moveTo(...p); else rays.lineTo(...p);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, radius * 0.9, 0, Math.PI * 2, true);
  rays.holes.push(hole);
  const rayGeo = extrude(rays, radius * 0.08, radius * 0.04, 2);
  for (const g of [ring, rayGeo]) g.translate(0, y, z);
  const core = new THREE.SphereGeometry(radius * 0.55, 32, 20);
  core.scale(1, 1, 0.5);
  core.translate(0, y, z + radius * 0.05);
  return { gold: [ring, rayGeo], core };
}

// ---------------------------------------------------------------------------

export function greatHelm() {
  const group = new THREE.Group();
  group.name = 'greatHelm';
  const profile = [[0, 0.62], [0.16, 0.6], [0.3, 0.52], [0.39, 0.38], [0.42, 0.2], [0.42, -0.2], [0.44, -0.38], [0.47, -0.46]];
  const helm = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 64);
  group.add(mesh(helm, blackSteel(), 'helm'));
  const inner = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(Math.max(0, x - 0.03), y)).reverse(), 64);
  group.add(mesh(inner, darkCloth(), 'lining'));
  // Visor slit (dark recessed band) with gold brow and cheek trims.
  const slit = shell({ y0: 0.05, y1: 0.11, a0: -0.9, a1: 0.9, width: () => 0.425, depth: () => 0.425, thickness: 0.01, segU: 30, segV: 2 });
  group.add(mesh(slit.geometry, new THREE.MeshStandardMaterial({ name: 'visor', color: 0x040406, roughness: 0.9, metalness: 0 }), 'visorSlit'));
  const ring = (y, r, from = -Math.PI, to = Math.PI, n = 60) => Array.from({ length: n + 1 }, (_, k) => { const a = from + (k / n) * (to - from); return new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r); });
  const trims = [trim(ring(0.14, 0.43, -1.05, 1.05), 0.02), trim(ring(0.02, 0.43, -1.05, 1.05), 0.02), trim(ring(-0.46, 0.475), 0.024)];
  // Cross ridge: over the crown and down the face.
  trims.push(trim(Array.from({ length: 30 }, (_, k) => { const a = (k / 29) * Math.PI - Math.PI / 2; return new THREE.Vector3(0, 0.2 + Math.cos(a) * 0.43, Math.sin(a) * 0.43); }), 0.022));
  trims.push(trim([new THREE.Vector3(0, 0.02, 0.44), new THREE.Vector3(0, -0.2, 0.44), new THREE.Vector3(0, -0.4, 0.46)], 0.022));
  // Breathing holes in a fan on each cheek.
  const holes = [];
  for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
    const a = side * (0.35 + (k % 3) * 0.12), y = -0.12 - Math.floor(k / 3) * 0.09;
    const h = new THREE.SphereGeometry(0.018, 8, 6);
    h.translate(Math.sin(a) * 0.425, y, Math.cos(a) * 0.425);
    holes.push(h);
  }
  group.add(merged(holes, new THREE.MeshStandardMaterial({ name: 'holes', color: 0x050507, roughness: 1 }), 'breaths'));
  // Crown of gold points like the concept's circlet.
  const crown = [];
  for (let k = 0; k < 9; k++) {
    const a = -0.9 + (k / 8) * 1.8;
    const spike = new THREE.ConeGeometry(0.035, k === 4 ? 0.22 : 0.13, 8);
    spike.translate(Math.sin(a) * 0.39, 0.46 + (k === 4 ? 0.05 : 0), Math.cos(a) * 0.39);
    crown.push(spike);
  }
  crown.push(trim(ring(0.4, 0.4, -1.0, 1.0), 0.02));
  group.add(merged([...trims, ...crown], gold(), 'goldTrim'));
  const gem = new THREE.OctahedronGeometry(0.05, 0);
  gem.scale(0.8, 1.3, 0.6);
  gem.translate(0, 0.42, 0.42);
  group.add(mesh(faceted(gem), crystal(0xffb347, { glow: 2 }), 'crownGem'));
  return group;
}

export function sunCuirass() {
  const group = new THREE.Group();
  group.name = 'sunCuirass';
  const width = y => (y > 0.25 ? lerp(0.5, 0.56, (y - 0.25) / 0.45) : y > -0.25 ? lerp(0.42, 0.5, (y + 0.25) / 0.5) : lerp(0.46, 0.42, (y + 0.7) / 0.45));
  const depth = y => 0.3 + 0.06 * Math.max(0, 1 - Math.abs(y - 0.3) / 0.5);
  const front = shell({ y0: -0.7, y1: 0.7, width, depth, segU: 40, segV: 32 });
  const back = shell({ y0: -0.7, y1: 0.7, a0: Math.PI / 2, a1: Math.PI * 1.5, width, depth: () => 0.28, segU: 40, segV: 20 });
  group.add(merged([front.geometry, back.geometry], blackSteel(), 'cuirass'));
  // Gold trims: neckline, hem and the side seams.
  const trims = [front.rims[1], front.rims[0], back.rims[1], back.rims[0], front.rims[2], front.rims[3]].map(p => trim(p, 0.022));
  // Faulds: three overlapping bands below the waist.
  const faulds = [];
  for (let k = 0; k < 3; k++) {
    const y0 = -0.78 - k * 0.14;
    const band = shell({ y0: y0 - 0.14, y1: y0, a0: -1.25, a1: 1.25, width: () => 0.46 + k * 0.03, depth: () => 0.34 + k * 0.03, segU: 30, segV: 4 });
    faulds.push(band.geometry);
    trims.push(trim(band.rims[0], 0.014));
  }
  group.add(merged(faulds, blackSteel(), 'faulds'));
  // Layered pauldrons.
  const pauldrons = [];
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
    const cap = new THREE.SphereGeometry(0.3 - k * 0.03, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
    cap.scale(1.15, 0.9, 1);
    cap.rotateZ(-side * (0.5 + k * 0.18));
    cap.translate(side * (0.62 + k * 0.04), 0.62 - k * 0.12, 0);
    pauldrons.push(cap);
    const rimPts = Array.from({ length: 41 }, (_, i) => { const a = (i / 40) * Math.PI * 2, r = (0.3 - k * 0.03) * Math.sin(Math.PI * 0.42); return new THREE.Vector3(Math.cos(a) * r * 1.15, Math.cos(Math.PI * 0.42) * (0.3 - k * 0.03) * 0.9, Math.sin(a) * r); });
    const t = trim(rimPts, 0.012);
    t.rotateZ(-side * (0.5 + k * 0.18));
    t.translate(side * (0.62 + k * 0.04), 0.62 - k * 0.12, 0);
    trims.push(t);
  }
  group.add(merged(pauldrons, blackSteel(), 'pauldrons'));
  // Sun emblem on the chest and filigree under it.
  const emblem = sunEmblem(0.11, depth(0.3) + 0.02, 0.3);
  const filigree = [-1, 1].map(side => scroll(new THREE.Vector3(side * 0.14, 0.02, depth(0) + 0.015), { radius: 0.1, turns: 1.2, angle: side > 0 ? 0 : Math.PI, flip: side, thickness: 0.012 }));
  group.add(merged([...trims, ...emblem.gold, ...filigree], gold(), 'goldTrim'));
  group.add(mesh(emblem.core, crystal(0xffc259, { glow: 2.4 }), 'sunCore'));
  return group;
}

function gauntlet(side) {
  const parts = { steel: [], gold: [] };
  // Flared cuff.
  const cuff = shell({ y0: 0.0, y1: 0.24, a0: -Math.PI, a1: Math.PI, width: y => lerp(0.15, 0.2, y / 0.24), depth: y => lerp(0.13, 0.17, y / 0.24), segU: 40, segV: 8 });
  cuff.geometry.translate(0, 0.35, 0);
  parts.steel.push(cuff.geometry);
  const cuffRim = cuff.rims[1].map(p => p.clone().add(new THREE.Vector3(0, 0.35, 0)));
  parts.gold.push(trim(cuffRim, 0.018));
  // Back-of-hand plate.
  const plate = shell({ y0: -0.22, y1: 0.05, a0: -1.1, a1: 1.1, width: () => 0.17, depth: () => 0.12, segU: 20, segV: 8 });
  plate.geometry.translate(0, 0.3, 0);
  parts.steel.push(plate.geometry);
  // Four articulated fingers + thumb, slightly curled.
  for (let f = 0; f < 4; f++) {
    let y = 0.06, z = 0.04;
    for (let s = 0; s < 3; s++) {
      const seg = new THREE.CapsuleGeometry(0.032, 0.085, 4, 10);
      seg.rotateX(-0.25 * s);
      seg.translate(-0.11 + f * 0.073, y, z);
      parts.steel.push(seg);
      y -= 0.11;
      z += 0.02 * s;
    }
  }
  const thumb = new THREE.CapsuleGeometry(0.035, 0.12, 4, 10);
  thumb.rotateZ(side * 0.9);
  thumb.translate(side * 0.18, 0.12, 0.05);
  parts.steel.push(thumb);
  const knuckles = trim(Array.from({ length: 11 }, (_, k) => new THREE.Vector3(-0.15 + k * 0.03, 0.1, 0.12 + Math.sin((k / 10) * Math.PI) * 0.02)), 0.014);
  parts.gold.push(knuckles);
  return parts;
}

export function plateGauntlets() {
  const group = new THREE.Group();
  group.name = 'plateGauntlets';
  const steel = [], goldParts = [];
  for (const side of [-1, 1]) {
    const { steel: s, gold: g } = gauntlet(side);
    for (const geo of [...s, ...g]) { geo.rotateZ(side * 0.12); geo.translate(side * 0.3, 0, 0); }
    steel.push(...s);
    goldParts.push(...g);
  }
  group.add(merged(steel, blackSteel(), 'gauntlets'));
  group.add(merged(goldParts, gold(), 'goldTrim'));
  const gems = [-1, 1].map(side => { const g = new THREE.OctahedronGeometry(0.04, 0); g.translate(side * 0.3, 0.2, 0.14); return faceted(g); });
  group.add(merged(gems, crystal(0xffb347, { glow: 1.8 }), 'gems'));
  return group;
}

export function plateGreaves() {
  const group = new THREE.Group();
  group.name = 'plateGreaves';
  const steel = [], goldParts = [];
  for (const side of [-1, 1]) {
    const x = side * 0.24;
    const thigh = shell({ y0: 0.05, y1: 0.7, a0: -1.4, a1: 1.4, width: y => lerp(0.15, 0.2, y / 0.7), depth: y => lerp(0.13, 0.17, y / 0.7), segU: 28, segV: 14 });
    const shin = shell({ y0: -0.85, y1: -0.12, a0: -1.5, a1: 1.5, width: y => lerp(0.11, 0.15, (y + 0.85) / 0.73), depth: y => lerp(0.1, 0.14, (y + 0.85) / 0.73), segU: 28, segV: 14 });
    for (const piece of [thigh, shin]) {
      piece.geometry.translate(x, 0, 0);
      steel.push(piece.geometry);
      goldParts.push(...[piece.rims[0], piece.rims[1]].map(r => trim(r.map(p => p.clone().add(new THREE.Vector3(x, 0, 0))), 0.015)));
    }
    // Knee cop with a gold fan wing.
    const knee = new THREE.SphereGeometry(0.13, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    knee.rotateX(Math.PI / 2);
    knee.translate(x, -0.04, 0.1);
    steel.push(knee);
    const fan = new THREE.Shape();
    fan.moveTo(0, 0);
    for (let k = 0; k <= 10; k++) { const a = -0.2 + (k / 10) * 1.4, r = k % 2 ? 0.14 : 0.2; fan.lineTo(Math.cos(a) * r * side, Math.sin(a) * r); }
    fan.closePath();
    const fanGeo = extrude(fan, 0.015, 0.006, 1);
    fanGeo.translate(x + side * 0.08, -0.04, 0.17);
    goldParts.push(fanGeo);
  }
  group.add(merged(steel, blackSteel(), 'greaves'));
  group.add(merged(goldParts, gold(), 'goldTrim'));
  return group;
}

export function sabatons() {
  const group = new THREE.Group();
  group.name = 'sabatons';
  const steel = [], goldParts = [];
  for (const side of [-1, 1]) {
    const x = side * 0.22;
    const cuff = shell({ y0: 0.05, y1: 0.34, a0: -Math.PI, a1: Math.PI, width: y => lerp(0.14, 0.17, y / 0.34), depth: y => lerp(0.13, 0.16, y / 0.34), segU: 36, segV: 8 });
    cuff.geometry.translate(x, 0, 0);
    steel.push(cuff.geometry);
    goldParts.push(trim(cuff.rims[1].map(p => p.clone().add(new THREE.Vector3(x, 0, 0))), 0.016));
    // Overlapping foot lames stepping forward to a pointed toe.
    for (let k = 0; k < 5; k++) {
      const r = 0.17 - k * 0.02;
      const lame = new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      lame.scale(1, 0.95 - k * 0.1, 1.15);
      lame.translate(x, -0.06, 0.1 + k * 0.1);
      steel.push(lame);
      // Gold edge on each overlapping lame.
      goldParts.push(trim(Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI; return new THREE.Vector3(x + Math.cos(a) * r, -0.06 + Math.sin(a) * r * (0.95 - k * 0.1), 0.1 + k * 0.1 + r * 1.15 * 0.25); }), 0.01));
    }
    const toe = new THREE.ConeGeometry(0.07, 0.22, 16);
    toe.rotateX(Math.PI / 2);
    toe.translate(x, -0.06, 0.62);
    steel.push(toe);
    const sole = new THREE.BoxGeometry(0.24, 0.03, 0.66, 2, 1, 4);
    sole.translate(x, -0.08, 0.26);
    steel.push(sole);
    // Gold spur-like wing at the ankle.
    const wing = extrude((() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.1, 0.12, 0.05, 0.3); s.quadraticCurveTo(-0.02, 0.12, 0, 0); return s; })(), 0.012, 0.006, 1);
    wing.rotateY(side * Math.PI / 2);
    wing.translate(x + side * 0.16, 0.1, 0);
    goldParts.push(wing);
  }
  group.add(merged(steel, blackSteel(), 'sabatons'));
  group.add(merged(goldParts, gold(), 'goldTrim'));
  return group;
}
