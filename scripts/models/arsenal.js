// More weapon samples in the ornate "celestial" style of the reference sheets:
//   celestialBow()  — lacquered white-and-gold recurve with crystal leaf tips and a glowing string
//   runeCrossbow()  — carved wood stock, steel prod, glowing bolt
//   warHammer()     — octagonal steel head with gold bands, spikes and a rune ring
//   spikedKnuckles()— knuckle-duster ("кастеты") with a crowned gem

import * as THREE from 'three';
import { Layer, fbm, rng, scratches } from './texture.js';
import { leatherWrapMaps, planarUV, texturedMaterial } from './weapons.js';
import { crystal, extrude, faceted, gold, merged, mesh, mirrorX, scroll, silver, wingShape } from './jewelry.js';

/**
 * Tube along `points` whose radius tapers r0 → r1 and whose cross-section is
 * squashed in the curve's plane (`thin` < 1) but kept full along Z: bow limbs
 * and prods are wide and thin, not round.
 */
export function taperedTube(points, r0, r1, { tubular = 64, radial = 12, thin = 1, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, closed);
  const tube = new THREE.TubeGeometry(curve, tubular, r0, radial, closed);
  const p = tube.attributes.position, ring = radial + 1;
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.floor(i / ring) / tubular), c = curve.getPointAt(t);
    const k = (r0 + (r1 - r0) * t) / r0;
    const dx = (p.getX(i) - c.x) * k * thin, dy = (p.getY(i) - c.y) * k * thin, dz = (p.getZ(i) - c.z) * k;
    p.setXYZ(i, c.x + dx, c.y + dy, c.z + dz);
  }
  tube.computeVertexNormals();
  return tube;
}

const lacquer = color => new THREE.MeshStandardMaterial({ name: 'lacquer', color, metalness: 0.2, roughness: 0.18 });

function woodMaps(width, height, seed, tone = [0.42, 0.24, 0.13]) {
  const heightMap = new Layer(width, height).paint((u, v) => {
    const grain = fbm(u, v, { frequency: 3, stretch: [10, 1], seed });
    const rings = Math.sin((u * 24 + grain * 6) * Math.PI) * 0.5 + 0.5;
    return [0.4 + rings * 0.3 + grain * 0.3, 0, 0, 1];
  });
  const albedo = new Layer(width, height).paint((u, v, x, y) => {
    const h = heightMap.get(x, y)[0];
    return [...tone.map(c => c * (0.6 + h * 0.7)), 1];
  });
  const rough = new Layer(width, height).paint((u, v, x, y) => [0.45 + (1 - heightMap.get(x, y)[0]) * 0.3, 0, 0, 1]);
  const metal = new Layer(width, height, [0, 0, 0, 1]);
  return { albedo, rough, metal, height: heightMap };
}

/** Worked steel: gentle hammer dents and fine scratches (brass tarnish reads as granite on steel). */
function steelMaps(size, seed, tone = [0.62, 0.64, 0.68]) {
  const r = rng(seed + 1);
  const height = new Layer(size).paint((u, v) => [0.6 + (fbm(u, v, { frequency: 6, seed }) - 0.5) * 0.25, 0, 0, 1]);
  for (const line of scratches(r, 40, { angle: r() * Math.PI, spread: 1, length: [0.02, 0.1] })) height.stroke(line, 0.0014, (px, c) => [px[0] - 0.08 * c, 0, 0, 1]);
  const albedo = new Layer(size).paint((u, v, x, y) => { const h = height.get(x, y)[0]; return [...tone.map(c => c * (0.82 + (h - 0.6) * 0.8)), 1]; });
  const rough = new Layer(size).paint((u, v, x, y) => [0.26 + (0.6 - height.get(x, y)[0]) * 0.6, 0, 0, 1]);
  const metal = new Layer(size, size, [1, 1, 1, 1]);
  return { albedo, rough, metal, height };
}

// ---------------------------------------------------------------------------

export function celestialBow() {
  const group = new THREE.Group();
  group.name = 'celestialBow';
  const V = (x, y) => new THREE.Vector3(x, y, 0);
  const upper = [V(0.6, 0.2), V(0.54, 0.62), V(0.32, 1.08), V(0.04, 1.44), V(-0.1, 1.64), V(-0.02, 1.8)];
  const lower = upper.map(p => V(p.x, -p.y));
  const white = lacquer(0xf3eee8);
  const limbs = [taperedTube(upper, 0.07, 0.022, { thin: 0.5 }), taperedTube(lower, 0.07, 0.022, { thin: 0.5 })];
  group.add(merged(limbs, white, 'limbs'));
  // Gold edge inlays riding the front and back of each limb.
  const edges = [];
  for (const pts of [upper, lower]) for (const z of [-0.055, 0.055]) edges.push(taperedTube(pts.map(p => new THREE.Vector3(p.x, p.y, z)), 0.012, 0.006, { radial: 6 }));
  group.add(merged(edges, gold(), 'limbInlay'));
  // Filigree scrolls on the limb faces.
  const scrolls = [];
  const upperCurve = new THREE.CatmullRomCurve3(upper);
  for (const t of [0.25, 0.45, 0.65]) for (const sign of [1, -1]) {
    const p = upperCurve.getPointAt(t);
    scrolls.push(scroll(new THREE.Vector3(p.x, sign * p.y, 0.06), { radius: 0.08, turns: 1.1, angle: sign > 0 ? 0 : Math.PI, flip: sign, thickness: 0.009 }));
  }
  group.add(merged(scrolls, gold(), 'filigree'));
  // Crystal leaf flares at both tips and at the limb roots.
  const leaves = [];
  for (const sign of [1, -1]) {
    for (const [pos, rot, size] of [[upper[4], 0.5, 0.34], [upper[1], -0.6, 0.24]]) {
      const g = extrude(wingShape(size, size * 0.4, 0.3), 0.015, 0.008, 2);
      g.rotateZ(rot);
      if (sign < 0) { mirrorX(g); g.scale(-1, -1, 1); }
      g.translate(pos.x - 0.02, sign * pos.y, 0);
      leaves.push(g);
    }
  }
  group.add(merged(leaves, crystal(0xb58cff, { glow: 1.2 }), 'crystalLeaves'));

  // Grip, collars and the crescent-and-gem centrepiece.
  const grip = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 28, 1, true);
  grip.translate(0.62, 0, 0);
  group.add(mesh(grip, texturedMaterial('bowGrip', leatherWrapMaps(128, 256, 12, [0.3, 0.18, 0.28], 10), { normalStrength: 5 }), 'grip'));
  const collars = [0.2, -0.2].map(y => { const c = new THREE.TorusGeometry(0.066, 0.016, 10, 32); c.rotateX(Math.PI / 2); c.translate(0.62, y, 0); return c; });
  group.add(merged(collars, gold(), 'collars'));
  const crescent = new THREE.Shape();
  crescent.absarc(0, 0, 0.16, -Math.PI * 0.62, Math.PI * 0.62, true);
  crescent.absarc(0.07, 0.01, 0.13, Math.PI * 0.55, -Math.PI * 0.58, false);
  const crescentGeo = extrude(crescent, 0.03, 0.015, 3);
  crescentGeo.translate(0.56, 0, 0.07);
  group.add(mesh(crescentGeo, gold(), 'crescent'));
  const gem = new THREE.OctahedronGeometry(0.06, 0);
  gem.scale(0.8, 1.3, 0.6);
  gem.translate(0.6, 0, 0.1);
  group.add(mesh(faceted(gem), crystal(0xd28bff, { glow: 2.2 }), 'centerGem'));

  // Glowing bowstring between the tips.
  const tip = upper[upper.length - 1];
  const string = new THREE.CylinderGeometry(0.006, 0.006, tip.y * 2, 8);
  string.translate(tip.x, 0, 0);
  group.add(mesh(string, crystal(0xe7d2ff, { glow: 2.5 }), 'string'));
  return group;
}

export function runeCrossbow() {
  const group = new THREE.Group();
  group.name = 'runeCrossbow';
  // Stock profile (side view in XY, thin in Z): butt at the bottom, tiller up to the prod.
  const stock = new THREE.Shape();
  stock.moveTo(-0.07, 0.95);
  stock.lineTo(0.07, 0.95);
  stock.lineTo(0.09, 0.05);
  stock.quadraticCurveTo(0.22, -0.25, 0.18, -0.6);
  stock.lineTo(-0.18, -0.6);
  stock.quadraticCurveTo(-0.13, -0.25, -0.09, 0.0);
  stock.closePath();
  const stockGeo = planarUV(extrude(stock, 0.14, 0.03, 3));
  group.add(mesh(stockGeo, texturedMaterial('crossbowWood', woodMaps(128, 256, 5), { normalStrength: 3 }), 'stock'));
  const steel = texturedMaterial('crossbowSteel', steelMaps(128, 17));
  // Prod: a flattened recurved arc across the front.
  const prodPts = [[-0.95, 0.72], [-0.6, 0.86], [-0.25, 0.93], [0, 0.94], [0.25, 0.93], [0.6, 0.86], [0.95, 0.72]].map(([x, y]) => new THREE.Vector3(x, y, 0.02));
  const halfA = taperedTube(prodPts.slice(0, 4), 0.04, 0.085, { thin: 0.75 });
  const halfB = taperedTube(prodPts.slice(3), 0.085, 0.04, { thin: 0.75 });
  // Gold caps on the prod tips.
  const caps = [prodPts[0], prodPts[6]].map(p => { const c = new THREE.SphereGeometry(0.05, 16, 12); c.translate(p.x, p.y, p.z); return c; });
  group.add(merged(caps, gold(), 'prodCaps'));
  group.add(merged([halfA, halfB], steel, 'prod'));
  // String drawn back to the nut, glowing bolt in the groove.
  const nut = new THREE.Vector3(0, 0.45, 0.09);
  const strings = [prodPts[0], prodPts[6]].map(end => {
    const len = end.distanceTo(nut);
    const g = new THREE.CylinderGeometry(0.006, 0.006, len, 6);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(nut).normalize()));
    g.translate(nut.x, nut.y, nut.z);
    return g;
  });
  group.add(merged(strings, crystal(0xffd79a, { glow: 1.6 }), 'string'));
  const shaft = new THREE.CylinderGeometry(0.014, 0.014, 0.75, 10);
  shaft.translate(0, 0.83, 0.1);
  group.add(mesh(shaft, gold(), 'boltShaft'));
  const head = new THREE.OctahedronGeometry(0.05, 0);
  head.scale(0.7, 1.8, 0.7);
  head.translate(0, 1.26, 0.1);
  group.add(mesh(faceted(head), crystal(0xff8a3d, { glow: 2.6 }), 'boltHead'));
  // Gold fittings, trigger and stirrup.
  const fittings = [];
  for (const y of [0.62, 0.2, -0.3]) { const b = new THREE.BoxGeometry(0.2, 0.05, 0.19); b.translate(0, y, 0); fittings.push(b); }
  const stirrup = new THREE.TorusGeometry(0.12, 0.018, 10, 40);
  stirrup.scale(1, 0.7, 1);
  stirrup.translate(0, 1.08, 0);
  const trigger = new THREE.TorusGeometry(0.06, 0.012, 8, 24, Math.PI);
  trigger.rotateZ(Math.PI);
  trigger.translate(0.05, -0.08, 0);
  group.add(merged([...fittings.map(g => g), stirrup, trigger], gold(), 'fittings'));
  return group;
}

export function warHammer() {
  const group = new THREE.Group();
  group.name = 'warHammer';
  const steel = texturedMaterial('hammerSteel', steelMaps(128, 29, [0.5, 0.52, 0.58]));
  // Octagonal head, axis along X.
  const oct = new THREE.Shape();
  for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8, p = [Math.cos(a) * 0.26, Math.sin(a) * 0.26]; if (k === 0) oct.moveTo(...p); else oct.lineTo(...p); }
  const head = planarUV(extrude(oct, 0.62, 0.05, 3));
  head.rotateY(Math.PI / 2);
  head.translate(0.12, 1.25, 0);
  group.add(mesh(head, steel, 'head'));
  // Gold bands, striking-face rims and a rune ring.
  const bands = [];
  for (const x of [-0.14, 0.38]) { const b = new THREE.TorusGeometry(0.265, 0.03, 10, 8); b.rotateY(Math.PI / 2); b.rotateX(Math.PI / 8); b.translate(x, 1.25, 0); bands.push(b); }
  const face = new THREE.TorusGeometry(0.17, 0.025, 10, 8);
  face.rotateY(Math.PI / 2);
  face.rotateX(Math.PI / 8);
  face.translate(0.47, 1.25, 0);
  bands.push(face);
  // Gold filigree on the broad front/back faces and rivets along both bands.
  const ornament = [];
  for (const z of [-0.26, 0.26]) for (const [x, flip] of [[0.0, 1], [0.24, -1]]) {
    ornament.push(scroll(new THREE.Vector3(x, 1.25, z), { radius: 0.09, turns: 1.3, angle: flip > 0 ? 0 : Math.PI, flip, thickness: 0.012, plane: 'xy' }));
  }
  for (const x of [-0.14, 0.38]) for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const rivet = new THREE.SphereGeometry(0.022, 12, 8);
    rivet.translate(x, 1.25 + Math.sin(a) * 0.29, Math.cos(a) * 0.29);
    ornament.push(rivet);
  }
  group.add(merged([...bands, ...ornament], gold(), 'bands'));
  const rune = new THREE.TorusGeometry(0.268, 0.012, 8, 8);
  rune.rotateY(Math.PI / 2);
  rune.rotateX(Math.PI / 8);
  rune.translate(0.12, 1.25, 0);
  group.add(mesh(rune, crystal(0x5fd8ff, { glow: 2.2 }), 'runeRing'));
  // Back spike and crown spike.
  const back = new THREE.ConeGeometry(0.12, 0.5, 8);
  back.rotateZ(Math.PI / 2);
  back.translate(-0.45, 1.25, 0);
  const crown = new THREE.ConeGeometry(0.08, 0.34, 8);
  crown.translate(0.12, 1.66, 0);
  group.add(merged([back, crown], steel, 'spikes'));
  // Haft, grip and pommel.
  const haft = new THREE.LatheGeometry([[0, -1.05], [0.07, -1.05], [0.075, -0.9], [0.06, -0.85], [0.055, 0.9], [0.075, 0.95], [0.075, 1.0], [0.06, 1.05], [0, 1.05]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
  group.add(mesh(haft, texturedMaterial('hammerHaft', woodMaps(128, 256, 8, [0.3, 0.17, 0.1]), { normalStrength: 3 }), 'haft'));
  const grip = new THREE.CylinderGeometry(0.066, 0.066, 0.7, 24, 1, true);
  grip.translate(0, -0.45, 0);
  group.add(mesh(grip, texturedMaterial('hammerGrip', leatherWrapMaps(128, 256, 30), { normalStrength: 5 }), 'grip'));
  const pommel = new THREE.ConeGeometry(0.08, 0.22, 8);
  pommel.rotateX(Math.PI);
  pommel.translate(0, -1.16, 0);
  group.add(mesh(pommel, gold(), 'pommel'));
  return group;
}

export function spikedKnuckles() {
  const group = new THREE.Group();
  group.name = 'spikedKnuckles';
  const dark = texturedMaterial('knuckleSteel', steelMaps(128, 41, [0.22, 0.2, 0.24]));
  // Four finger rings in a row (axis along Z so the holes face the viewer).
  const rings = [];
  for (let k = 0; k < 4; k++) { const r = new THREE.TorusGeometry(0.13, 0.045, 14, 40); r.translate(-0.42 + k * 0.28, 0, 0); rings.push(r); }
  group.add(merged(rings, dark, 'fingerRings'));
  // Striking bar with spikes along the top.
  const bar = new THREE.CapsuleGeometry(0.06, 0.95, 6, 16);
  bar.rotateZ(Math.PI / 2);
  bar.translate(0, 0.19, 0);
  const spikes = [];
  for (let k = 0; k < 4; k++) { const s = new THREE.ConeGeometry(0.06, 0.26, 8); s.translate(-0.42 + k * 0.28, 0.36, 0); spikes.push(s); }
  group.add(merged([bar, ...spikes], silver(), 'spikedBar'));
  // Palm grip underneath.
  const palm = new THREE.CapsuleGeometry(0.075, 0.7, 6, 16);
  palm.rotateZ(Math.PI / 2);
  palm.translate(0, -0.27, 0);
  group.add(mesh(palm, texturedMaterial('knuckleGrip', leatherWrapMaps(128, 256, 55, [0.35, 0.08, 0.1], 8), { normalStrength: 5 }), 'palmGrip'));
  // Crowned gem on the front.
  const setting = new THREE.TorusGeometry(0.09, 0.022, 10, 32);
  setting.translate(0, 0.19, 0.08);
  const scrolls = [-1, 1].map(side => scroll(new THREE.Vector3(side * 0.16, 0.19, 0.07), { radius: 0.08, turns: 1, angle: side > 0 ? 0 : Math.PI, flip: side, thickness: 0.012 }));
  group.add(merged([setting, ...scrolls], gold(), 'gemSetting'));
  const gem = new THREE.OctahedronGeometry(0.08, 0);
  gem.scale(1, 1, 0.6);
  gem.translate(0, 0.19, 0.11);
  group.add(mesh(faceted(gem), crystal(0xff3d5a, { glow: 2 }), 'gem'));
  return group;
}
