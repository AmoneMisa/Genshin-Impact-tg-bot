// High-poly jewellery samples in an ornate "fairy fantasy" style:
//   filigreeRing()  — scroll-work band with a bezel-set cabochon (B–S grades)
//   wingedRing()    — crowned crystal heart with translucent veined wings (SS/SSS)
//   butterflyNecklace(), crescentEarring(), flowerTiara()
//
// Mostly untextured PBR: polished metal and glowing crystal read best as clean
// surfaces reflecting the environment. Repeated small parts (chain links, petals,
// scrolls) are merged per material so each model stays a handful of draw calls.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---- materials ----
const gold = () => new THREE.MeshStandardMaterial({ name: 'gold', color: 0xe3b35c, metalness: 1, roughness: 0.22 });
const silver = () => new THREE.MeshStandardMaterial({ name: 'silver', color: 0xdfe4ee, metalness: 1, roughness: 0.18 });
const pearl = () => new THREE.MeshStandardMaterial({ name: 'pearl', color: 0xf6ece6, metalness: 0.1, roughness: 0.28 });
const enamel = color => new THREE.MeshStandardMaterial({ name: 'enamel', color, metalness: 0.15, roughness: 0.35 });
/** Glowing crystal. Emissive so the runtime tints it by rarity and grades its glow. */
const crystal = (color, { opacity = 1, glow = 1.6 } = {}) => new THREE.MeshStandardMaterial({
  name: 'crystal', color, emissive: color, emissiveIntensity: glow, metalness: 0.05, roughness: 0.06,
  transparent: opacity < 1, opacity, side: opacity < 1 ? THREE.DoubleSide : THREE.FrontSide,
});

const mesh = (geometry, material, name) => Object.assign(new THREE.Mesh(geometry, material), { name });
// mergeGeometries needs all-indexed or all-non-indexed input; only fall back to
// non-indexed (3 unique vertices per triangle, ~3× larger) when the parts are mixed.
const merged = (geometries, material, name) => {
  const allIndexed = geometries.every(g => g.index);
  const parts = allIndexed ? geometries : geometries.map(g => (g.index ? g.toNonIndexed() : g));
  for (const g of parts) for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key);
  return mesh(mergeGeometries(parts), material, name);
};

/** Mirror across X and restore outward winding (a negative scale flips every triangle). */
function mirrorX(geometry) {
  geometry.scale(-1, 1, 1);
  if (geometry.index) {
    const idx = geometry.index.array;
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  } else {
    for (const attribute of Object.values(geometry.attributes)) {
      const n = attribute.itemSize, a = attribute.array;
      for (let v = 0; v < attribute.count; v += 3) for (let c = 0; c < n; c++) {
        const i1 = (v + 1) * n + c, i2 = (v + 2) * n + c;
        [a[i1], a[i2]] = [a[i2], a[i1]];
      }
    }
  }
  return geometry;
}

/** Faceted solid: one normal per facet, like a cut stone. */
function faceted(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.computeVertexNormals();
  return g;
}

/** Teardrop pendant (lathe), point up, hanging from y = 0. */
function teardrop(radius, segments = 24) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, a = t * Math.PI;
    pts.push(new THREE.Vector2(Math.sin(a) * radius * (0.35 + 0.65 * t), -t * radius * 2.6));
  }
  return new THREE.LatheGeometry(pts, segments);
}

/** Chain of alternating links along a curve. */
function chainAlong(curve, count, linkRadius = 0.022, wire = 0.006) {
  const links = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
    const link = new THREE.TorusGeometry(linkRadius, wire, 6, 14);
    link.scale(1.5, 1, 1); // oval links
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent);
    const twist = new THREE.Quaternion().setFromAxisAngle(tangent, i % 2 ? Math.PI / 2 : 0);
    link.applyQuaternion(twist.multiply(q));
    link.translate(p.x, p.y, p.z);
    links.push(link);
  }
  return links;
}

/** Filigree scroll: a spiral tube that thins toward its curled end. */
function scroll(origin, { radius = 0.12, turns = 1.3, angle = 0, flip = 1, thickness = 0.012, plane = 'xy' } = {}) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, a = angle + flip * t * turns * Math.PI * 2, r = radius * (1 - t * 0.75);
    const u = Math.cos(a) * r, v = Math.sin(a) * r;
    pts.push(plane === 'xy' ? new THREE.Vector3(origin.x + u, origin.y + v, origin.z) : new THREE.Vector3(origin.x + u, origin.y, origin.z + v));
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, thickness, 6, false);
  const p = tube.attributes.position, ring = 7;
  for (let i = 0; i < p.count; i++) {
    const seg = Math.floor(i / ring) / 32, c = new THREE.CatmullRomCurve3(pts).getPoint(Math.min(1, seg)), k = 1 - seg * 0.6;
    p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k);
  }
  tube.computeVertexNormals();
  return tube;
}

const extrude = (shape, depth, bevel = 0.01, segments = 3) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segments, curveSegments: 24 });
  g.translate(0, 0, -depth / 2);
  return g;
};

function heartShape(s = 1) {
  const h = new THREE.Shape();
  h.moveTo(0, -0.5 * s);
  h.bezierCurveTo(-0.08 * s, -0.36 * s, -0.5 * s, -0.12 * s, -0.5 * s, 0.14 * s);
  h.bezierCurveTo(-0.5 * s, 0.42 * s, -0.16 * s, 0.5 * s, 0, 0.26 * s);
  h.bezierCurveTo(0.16 * s, 0.5 * s, 0.5 * s, 0.42 * s, 0.5 * s, 0.14 * s);
  h.bezierCurveTo(0.5 * s, -0.12 * s, 0.08 * s, -0.36 * s, 0, -0.5 * s);
  return h;
}

/** Five-petal blossom (sakura-like) facing +Z. */
function blossom(radius) {
  const petals = new THREE.Shape();
  for (let k = 0; k <= 5 * 12; k++) {
    const a = (k / (5 * 12)) * Math.PI * 2;
    const petal = Math.abs(Math.sin((a * 5) / 2));
    const notch = 1 - 0.18 * Math.pow(Math.max(0, Math.cos(a * 5)), 8); // tiny notch at each petal tip
    const r = radius * (0.35 + 0.65 * Math.pow(petal, 0.6)) * notch;
    const p = [Math.cos(a + Math.PI / 2) * r, Math.sin(a + Math.PI / 2) * r];
    if (k === 0) petals.moveTo(...p); else petals.lineTo(...p);
  }
  const g = new THREE.ExtrudeGeometry(petals, { depth: radius * 0.12, bevelEnabled: true, bevelThickness: radius * 0.06, bevelSize: radius * 0.06, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -radius * 0.06);
  return g;
}

/** Leaf/wing blade outline between two points with a bulge; used for wings and tiara spires. */
function wingShape(length, width, tipCurl = 0.15) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(width * 0.9, length * 0.15, width * 1.1, length * 0.7, width * tipCurl, length);
  s.bezierCurveTo(-width * 0.2, length * 0.72, -width * 0.35, length * 0.3, 0, 0);
  return s;
}

// ---------------------------------------------------------------------------

export function filigreeRing() {
  const group = new THREE.Group();
  group.name = 'filigreeRing';
  const band = new THREE.TorusGeometry(0.5, 0.07, 40, 160);
  band.scale(1, 1, 1.6);
  group.add(mesh(band, gold(), 'band'));
  // Scroll-work riding on both shoulders of the band.
  const scrolls = [];
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
    const a = Math.PI / 2 + side * (0.35 + k * 0.32);
    const o = new THREE.Vector3(Math.cos(a) * 0.56, Math.sin(a) * 0.56, 0);
    for (const z of [-0.1, 0.1]) scrolls.push(scroll(new THREE.Vector3(o.x, o.y, z), { radius: 0.07, turns: 1.1, angle: a, flip: side, thickness: 0.011 }));
  }
  group.add(merged(scrolls, gold(), 'filigree'));
  // Bezel + oval cabochon.
  const bezel = new THREE.TorusGeometry(0.16, 0.03, 16, 64);
  bezel.scale(1, 1.25, 1);
  bezel.rotateX(Math.PI / 2);
  bezel.translate(0, 0.6, 0);
  group.add(mesh(bezel, gold(), 'bezel'));
  const stone = new THREE.SphereGeometry(0.15, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  stone.scale(1, 0.55, 1.25);
  stone.translate(0, 0.6, 0);
  group.add(mesh(stone, crystal(0x6fb8ff), 'cabochon'));
  return group;
}

export function wingedRing() {
  const group = new THREE.Group();
  group.name = 'wingedRing';
  const band = new THREE.TorusGeometry(0.5, 0.045, 32, 160);
  band.scale(1, 1, 1.3);
  group.add(mesh(band, gold(), 'band'));
  // Crossed-ribbon knot at the base of the band.
  const knot = [];
  for (const side of [-1, 1]) knot.push(scroll(new THREE.Vector3(side * 0.07, -0.52, 0), { radius: 0.09, turns: 0.8, angle: side > 0 ? Math.PI : 0, flip: -side, thickness: 0.014 }));
  group.add(merged(knot, gold(), 'knot'));

  // Crystal heart (bevelled, so it catches light like a cut stone) in a gold rim.
  const heart = extrude(heartShape(0.46), 0.07, 0.05, 4);
  heart.translate(0, 0.72, 0);
  group.add(mesh(faceted(heart), crystal(0xffb640, { glow: 0.9 }), 'heart'));
  const rimPts = heartShape(0.5).getSpacedPoints(120).map(p => new THREE.Vector3(p.x, p.y + 0.72, 0));
  group.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 200, 0.018, 8, true), gold(), 'heartRim'));
  // Little crown + star finial above the heart.
  const crownBase = new THREE.CylinderGeometry(0.05, 0.07, 0.06, 24);
  crownBase.translate(0, 1.0, 0);
  const spire = new THREE.ConeGeometry(0.03, 0.14, 12);
  spire.translate(0, 1.1, 0);
  group.add(merged([crownBase, spire], gold(), 'crown'));
  const star = new THREE.OctahedronGeometry(0.045, 0);
  star.translate(0, 1.21, 0);
  group.add(mesh(faceted(star), crystal(0xfff1c0, { glow: 3 }), 'crownStar'));

  // Two pairs of translucent wings with gold veins, mirrored.
  const wingMat = crystal(0xffd98a, { opacity: 0.45, glow: 0.6 });
  const wings = [], veins = [];
  for (const side of [-1, 1]) for (const [len, wid, tilt, lift] of [[0.62, 0.3, 1.05, 0.78], [0.42, 0.22, 1.9, 0.62]]) {
    const shape = wingShape(len, wid);
    const g = extrude(shape, 0.006, 0, 0);
    const outline = shape.getSpacedPoints(60).map(p => new THREE.Vector3(p.x, p.y, 0));
    const vein = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline, true), 90, 0.008, 6, true);
    const mid = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(wid * 0.35, len * 0.45, 0), new THREE.Vector3(wid * 0.2, len * 0.9, 0)]), 30, 0.006, 6, false);
    for (const geo of [g, vein, mid]) {
      if (side < 0) mirrorX(geo);
      geo.rotateZ(-side * tilt);
      geo.rotateY(side * 0.35);
      geo.translate(side * 0.2, lift, -0.02);
    }
    wings.push(g);
    veins.push(vein, mid);
  }
  group.add(merged(wings, wingMat, 'wings'));
  group.add(merged(veins, gold(), 'wingVeins'));
  // Side gems where the wings join.
  for (const side of [-1, 1]) {
    const g = new THREE.SphereGeometry(0.055, 24, 16);
    g.translate(side * 0.22, 0.72, 0.02);
    group.add(mesh(g, crystal(0xffc86b, { glow: 1.4 }), 'sideGem'));
  }
  return group;
}

export function butterflyNecklace() {
  const group = new THREE.Group();
  group.name = 'butterflyNecklace';
  // Chain draped in a catenary-like U.
  const drape = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.95, 0.9, -0.1), new THREE.Vector3(-0.8, 0.2, 0), new THREE.Vector3(-0.45, -0.28, 0.05),
    new THREE.Vector3(0, -0.42, 0.08), new THREE.Vector3(0.45, -0.28, 0.05), new THREE.Vector3(0.8, 0.2, 0), new THREE.Vector3(0.95, 0.9, -0.1),
  ]);
  group.add(merged(chainAlong(drape, 70, 0.024, 0.0065), silver(), 'chain'));
  // Beads along the chain.
  const beads = [];
  for (let k = 1; k < 12; k++) { const p = drape.getPointAt(k / 12); const b = new THREE.SphereGeometry(0.03, 16, 12); b.translate(p.x, p.y, p.z + 0.01); beads.push(b); }
  group.add(merged(beads, crystal(0x5d8dff, { glow: 0.8 }), 'beads'));

  // Butterfly pendant: four crystal wings with silver outlines, capsule body.
  const wingMat = crystal(0x3f6dff, { opacity: 0.9, glow: 1.2 });
  const wings = [], rims = [];
  for (const side of [-1, 1]) for (const [len, wid, rot] of [[0.36, 0.28, 0.55], [0.26, 0.2, 2.2]]) {
    const shape = wingShape(len, wid, 0.5);
    const g = extrude(shape, 0.02, 0.012, 2);
    const rim = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shape.getSpacedPoints(50).map(p => new THREE.Vector3(p.x, p.y, 0.022)), true), 80, 0.007, 6, true);
    for (const geo of [g, rim]) {
      if (side < 0) mirrorX(geo);
      geo.rotateZ(-side * rot);
      geo.scale(1.7, 1.7, 1.7);
      geo.translate(0, -0.6, 0.1);
    }
    wings.push(g);
    rims.push(rim);
  }
  group.add(merged(wings, wingMat, 'butterflyWings'));
  group.add(merged(rims, silver(), 'butterflyRims'));
  const body = new THREE.CapsuleGeometry(0.04, 0.34, 6, 16);
  body.translate(0, -0.62, 0.13);
  group.add(mesh(body, silver(), 'butterflyBody'));
  const bail = new THREE.TorusGeometry(0.03, 0.008, 8, 24);
  bail.translate(0, -0.43, 0.09);
  group.add(mesh(bail, silver(), 'bail'));
  // Three teardrop crystals dangling from short chains under the butterfly.
  const drops = [], dropChains = [];
  for (const [x, len] of [[-0.12, 0.18], [0, 0.3], [0.12, 0.18]]) {
    const top = new THREE.Vector3(x, -0.98, 0.1), bottom = new THREE.Vector3(x, -0.98 - len, 0.1);
    dropChains.push(...chainAlong(new THREE.LineCurve3(top, bottom), Math.round(len / 0.035), 0.012, 0.004));
    const d = teardrop(0.035);
    d.translate(bottom.x, bottom.y, bottom.z);
    drops.push(d);
  }
  group.add(merged(dropChains, silver(), 'dropChains'));
  group.add(merged(drops, crystal(0x8fb4ff, { glow: 1.3 }), 'drops'));
  return group;
}

export function crescentEarring() {
  const group = new THREE.Group();
  group.name = 'crescentEarring';
  // Crescent: outer circle minus an offset inner circle.
  const crescent = new THREE.Shape();
  crescent.absarc(0, 0, 0.36, -Math.PI * 0.62, Math.PI * 0.62, true);
  crescent.absarc(0.14, 0.02, 0.3, Math.PI * 0.55, -Math.PI * 0.58, false);
  crescent.closePath();
  const moon = extrude(crescent, 0.06, 0.03, 4);
  moon.translate(0, -0.35, 0);
  group.add(mesh(moon, silver(), 'crescent'));
  // Crystal inlay line following the crescent.
  const inlayPts = [];
  for (let i = 0; i <= 40; i++) { const a = Math.PI * 0.55 - (i / 40) * Math.PI * 1.1 + Math.PI; inlayPts.push(new THREE.Vector3(Math.cos(a) * 0.33, Math.sin(a) * 0.33 - 0.35, 0.05)); }
  group.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(inlayPts), 60, 0.012, 8, false), crystal(0x9fc4ff, { glow: 1.6 }), 'inlay'));
  // Four-point star above, hook on top, teardrop below.
  const star = new THREE.Shape();
  for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 2, r = k % 2 ? 0.035 : 0.11; const p = [Math.cos(a) * r, Math.sin(a) * r]; if (k === 0) star.moveTo(...p); else star.lineTo(...p); }
  const starGeo = extrude(star, 0.02, 0.012, 2);
  starGeo.translate(0, 0.2, 0);
  group.add(mesh(faceted(starGeo), crystal(0xcfe0ff, { glow: 2.2 }), 'star'));
  const hook = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.32, 0), new THREE.Vector3(0, 0.52, 0), new THREE.Vector3(0.12, 0.62, 0), new THREE.Vector3(0.2, 0.5, 0), new THREE.Vector3(0.18, 0.36, 0),
  ]), 60, 0.012, 8, false);
  group.add(mesh(hook, silver(), 'hook'));
  const links = chainAlong(new THREE.LineCurve3(new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0, 0.0, 0)), 3, 0.018, 0.005);
  group.add(merged(links, silver(), 'links'));
  const drop = teardrop(0.06);
  drop.translate(-0.2, -0.62, 0);
  group.add(mesh(drop, crystal(0x7fa8ff, { glow: 1.5 }), 'drop'));
  return group;
}

export function flowerTiara() {
  const group = new THREE.Group();
  group.name = 'flowerTiara';
  // Arched band (front half of an ellipse, seen from the front).
  const arc = t => { const a = Math.PI * (0.08 + 0.84 * t); return new THREE.Vector3(-Math.cos(a) * 1.0, Math.sin(a) * 0.28, Math.sin(a) * 0.35); };
  const bandCurve = new THREE.CatmullRomCurve3(Array.from({ length: 30 }, (_, i) => arc(i / 29)));
  group.add(mesh(new THREE.TubeGeometry(bandCurve, 110, 0.03, 10, false), gold(), 'band'));
  // Filigree scrolls along the band.
  const scrolls = [];
  for (let k = 0; k < 10; k++) {
    const t = 0.06 + (k / 9) * 0.88, p = arc(t);
    scrolls.push(scroll(new THREE.Vector3(p.x, p.y + 0.07, p.z + 0.01), { radius: 0.07, turns: 1.2, angle: k % 2 ? 0 : Math.PI, flip: k % 2 ? 1 : -1, thickness: 0.01 }));
  }
  group.add(merged(scrolls, gold(), 'filigree'));
  // Central spire: two leaf blades + tall gem.
  const spire = [];
  for (const side of [-1, 1]) {
    const g = extrude(wingShape(0.5, 0.14, 0.05), 0.02, 0.012, 2);
    if (side < 0) mirrorX(g);
    g.rotateZ(side * 0.12);
    g.translate(side * 0.04, 0.3, 0.36);
    spire.push(g);
  }
  group.add(merged(spire, gold(), 'spire'));
  const gem = new THREE.OctahedronGeometry(0.09, 0);
  gem.scale(0.8, 1.6, 0.6);
  gem.translate(0, 0.48, 0.38);
  group.add(mesh(faceted(gem), crystal(0xff7eb3, { glow: 1.8 }), 'centerGem'));
  // Blossoms: a big one at the centre, smaller ones spaced along the band.
  const petals = [], hearts = [];
  for (const [t, r] of [[0.5, 0.16], [0.36, 0.1], [0.64, 0.1], [0.22, 0.09], [0.78, 0.09], [0.1, 0.08], [0.9, 0.08]]) {
    const p = arc(t), b = blossom(r);
    b.rotateY(-(t - 0.5) * 1.6);
    b.translate(p.x, p.y + (t === 0.5 ? 0.12 : 0.02), p.z + 0.04);
    petals.push(b);
    const c = new THREE.SphereGeometry(r * 0.22, 16, 12);
    c.translate(p.x, p.y + (t === 0.5 ? 0.12 : 0.02), p.z + 0.04 + r * 0.12);
    hearts.push(c);
  }
  group.add(merged(petals, enamel(0xf7a6c4), 'blossoms'));
  group.add(merged(hearts, gold(), 'blossomHearts'));
  // Dangling teardrop pearls on short chains, longest at the centre.
  const chains = [], drops = [];
  for (let k = 0; k < 9; k++) {
    const t = 0.12 + (k / 8) * 0.76, p = arc(t);
    const len = 0.1 + 0.16 * (1 - Math.abs(t - 0.5) * 2);
    const top = new THREE.Vector3(p.x, p.y - 0.03, p.z + 0.02), bottom = new THREE.Vector3(p.x, p.y - 0.03 - len, p.z + 0.02);
    chains.push(...chainAlong(new THREE.LineCurve3(top, bottom), Math.max(2, Math.round(len / 0.03)), 0.01, 0.0035));
    const d = teardrop(0.03, 16);
    d.translate(bottom.x, bottom.y, bottom.z);
    drops.push(d);
  }
  group.add(merged(chains, gold(), 'dropChains'));
  group.add(merged(drops, pearl(), 'pearls'));
  return group;
}
