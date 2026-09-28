// Textured high-poly weapon samples, styled after classic fantasy-RPG hero items:
//   sunSword()    — engraved longsword with twin fullers and a blazing sun-ring guard
//   runeDagger()  — curved, serrated dark-steel dagger with glowing carved runes
//   voidBlade()   — stylised dark blade with a luminous core channel (SS/SSS variant)
//
// Geometry carries the silhouette; texture maps (albedo, packed roughness/metal,
// normal, emissive) carry the surface detail, exactly like hand-made game assets.

import * as THREE from 'three';
import { Layer, clamp01, fbm, glyph, mix, rng, scratches, smoothstep } from './texture.js';

// ---------------------------------------------------------------------------
// Texture → material plumbing
// ---------------------------------------------------------------------------

export function dataTexture(layer, { srgb = false } = {}) {
  const texture = new THREE.DataTexture(layer.toBytes(), layer.width, layer.height, THREE.RGBAFormat);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * maps: { albedo: Layer, rough: Layer (ch0 = roughness), metal: Layer (ch0), height: Layer, emissive?: Layer }
 * glTF wants roughness in G and metalness in B of ONE texture, so they're packed here.
 */
export function texturedMaterial(name, maps, { normalStrength = 3, emissiveIntensity = 1, normalScale = 1 } = {}) {
  const packed = new Layer(maps.rough.width, maps.rough.height).paint((u, v, x, y) => [1, maps.rough.get(x, y)[0], maps.metal.get(x, y)[0], 1]);
  const orm = dataTexture(packed);
  const material = new THREE.MeshStandardMaterial({
    name,
    map: dataTexture(maps.albedo, { srgb: true }),
    roughnessMap: orm,
    metalnessMap: orm,
    roughness: 1,
    metalness: 1,
    normalMap: dataTexture(maps.height.toNormalMap(normalStrength)),
    normalScale: new THREE.Vector2(normalScale, normalScale),
  });
  if (maps.emissive) {
    material.emissiveMap = dataTexture(maps.emissive, { srgb: true });
    material.emissive = new THREE.Color(0xffffff);
    material.emissiveIntensity = emissiveIntensity;
  }
  return material;
}

const mesh = (geometry, material, name) => Object.assign(new THREE.Mesh(geometry, material), { name });

/** Planar UVs from the XY bounding box — for extruded, mostly-flat parts. */
export function planarUV(geometry) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const p = geometry.attributes.position, uv = [];
  for (let i = 0; i < p.count; i++) uv.push((p.getX(i) - min.x) / (max.x - min.x || 1), (p.getY(i) - min.y) / (max.y - min.y || 1));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geometry;
}

/** Faceted look: split vertices so each flat face gets its own crisp normal. */
export function faceted(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Shared surface generators
// ---------------------------------------------------------------------------

/** Brass/gold with tarnish in the low spots and fine hammering. */
export function brassMaps(size, seed, tone = [0.83, 0.64, 0.33]) {
  const r = rng(seed);
  const height = new Layer(size).paint((u, v) => { const h = fbm(u, v, { frequency: 8, seed }) * 0.6 + fbm(u, v, { frequency: 32, seed: seed + 3 }) * 0.4; return [h, h, h, 1]; });
  for (const line of scratches(r, 60, { angle: r() * Math.PI, spread: 1, length: [0.02, 0.08] })) height.stroke(line, 0.0018, (px, c) => mix(px, [px[0] - 0.25, 0, 0, 1], c));
  const albedo = new Layer(size).paint((u, v, x, y) => {
    const h = height.get(x, y)[0];
    const tarnish = smoothstep(0.55, 0.25, h) * 0.55;
    return [...mix(tone, [0.32, 0.22, 0.12], tarnish), 1];
  });
  const rough = new Layer(size).paint((u, v, x, y) => { const h = height.get(x, y)[0]; return [0.22 + (1 - h) * 0.35, 0, 0, 1]; });
  const metal = new Layer(size, size, [1, 1, 1, 1]);
  return { albedo, rough, metal, height };
}

/** Diagonal leather wrap with stitched seams. */
export function leatherWrapMaps(width, height, seed, tone = [0.26, 0.15, 0.1], turns = 14) {
  const heightMap = new Layer(width, height).paint((u, v) => {
    const band = (v * turns + u) % 1;
    const ridge = Math.sin(band * Math.PI) ** 0.6;
    const grain = fbm(u, v, { frequency: 24, seed }) * 0.25;
    return [ridge * 0.75 + grain, 0, 0, 1];
  });
  const albedo = new Layer(width, height).paint((u, v, x, y) => {
    const h = heightMap.get(x, y)[0];
    const band = (v * turns + u) % 1;
    const stitch = Math.abs(band - 0.5) < 0.025 && Math.sin(u * 120) > 0.3 ? 0.35 : 0;
    const shade = 0.55 + h * 0.6;
    return [...mix(tone.map(c => c * shade), [0.62, 0.54, 0.42], stitch), 1];
  });
  const rough = new Layer(width, height).paint((u, v, x, y) => [0.62 + (1 - heightMap.get(x, y)[0]) * 0.25, 0, 0, 1]);
  const metal = new Layer(width, height, [0, 0, 0, 1]);
  return { albedo, rough, metal, height: heightMap };
}

// ---------------------------------------------------------------------------
// Blade loft: a cross-section swept along Y
// ---------------------------------------------------------------------------

/**
 * section(t) → [[x, z], ...] for the FRONT half from +edge to −edge; the back half
 * is mirrored. UVs: u across the blade (x / maxWidth), v along its length.
 */
export function loftBlade({ length, segments = 90, maxWidth, section }) {
  const positions = [], uvs = [], indices = [];
  let ring = 0;
  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    const front = section(t);
    const back = front.slice(1, -1).reverse().map(([x, z]) => [x, -z]);
    const loop = [...front, ...back];
    ring = loop.length;
    for (const [x, z] of loop) {
      positions.push(x, t * length, z);
      uvs.push(x / (2 * maxWidth) + 0.5, t);
    }
  }
  for (let s = 0; s < segments; s++) for (let k = 0; k < ring; k++) {
    const a = s * ring + k, b = s * ring + ((k + 1) % ring), c = a + ring, d = b + ring;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return faceted(geometry);
}

/** Point taper: full width until `start`, then a curved point to 0 at t = 1. */
export const pointTaper = (t, start = 0.86) => (t < start ? 1 - 0.1 * (t / start) : 0.9 * Math.sqrt(Math.max(0, 1 - (t - start) / (1 - start))) ** 1.35);

// ---------------------------------------------------------------------------
// 1. Sun-guard longsword
// ---------------------------------------------------------------------------

export function sunSword() {
  const group = new THREE.Group();
  group.name = 'sunSword';
  const L = 3.1, W = 0.2, TH = 0.05;
  const grooveAt = t => W * pointTaper(t) * 0.32;
  const grooveHalf = t => W * pointTaper(t) * 0.1;
  const grooveDepth = t => TH * 0.55 * smoothstep(0.86, 0.6, t);

  const blade = loftBlade({
    length: L, maxWidth: W, section: t => {
      const w = W * pointTaper(t), th = TH * (1 - t * 0.45), g = grooveAt(t), gh = grooveHalf(t), d = grooveDepth(t);
      return [[w, 0], [w * 0.64, th],
        [g + gh, th], [g, th - d], [g - gh, th],
        [-(g - gh), th], [-g, th - d], [-(g + gh), th],
        [-w * 0.64, th], [-w, 0]];
    },
  });

  // Blade textures: brushed steel, copper-stained fullers, reddish temper mottling,
  // etched ornament along the central ridge.
  const r = rng(101);
  const TW = 128, THh = 512;
  const grooveU = v => [0.5 + grooveAt(v) / (2 * W), 0.5 - grooveAt(v) / (2 * W)];
  const inGroove = (u, v) => Math.max(...grooveU(v).map(gu => smoothstep(grooveHalf(v) / (2 * W) * 1.3, 0, Math.abs(u - gu))));
  const height = new Layer(TW, THh).paint((u, v) => {
    const brushed = fbm(u, v, { frequency: 4, stretch: [16, 1], seed: 7 }) * 0.16;
    const dents = fbm(u, v, { frequency: 6, seed: 9 }) * 0.25;
    return [0.5 + brushed + dents - 0.3, 0, 0, 1];
  });
  // Etched ornament: a chain of small glyph-like engravings up the ridge.
  for (let k = 0; k < 11; k++) {
    const v0 = 0.08 + k * 0.066, strokes = glyph(r);
    for (const s of strokes) height.stroke(s.map(([x, y]) => [0.5 + (x - 0.5) * 0.09, v0 + y * 0.045]), 0.004, (px, c) => [px[0] - 0.4 * c, 0, 0, 1]);
  }
  for (const line of scratches(r, 70, { angle: Math.PI / 2, spread: 0.25, length: [0.02, 0.1] })) height.stroke(line, 0.0014, (px, c) => [px[0] - 0.08 * c, 0, 0, 1]);
  const albedo = new Layer(TW, THh).paint((u, v, x, y) => {
    const h = height.get(x, y)[0];
    let color = mix([0.66, 0.64, 0.6], [0.84, 0.82, 0.77], clamp01(h));
    const temper = smoothstep(0.55, 0.8, fbm(u, v, { frequency: 3, stretch: [1, 3], seed: 21 }));
    color = mix(color, [0.6, 0.36, 0.28], temper * 0.55);
    color = mix(color, [0.66, 0.34, 0.2], inGroove(u, v) * 0.75);
    color = mix(color, [0.3, 0.26, 0.22], smoothstep(0.3, 0.05, h) * 0.5); // grime in engravings
    return [...color, 1];
  });
  const rough = new Layer(TW, THh).paint((u, v, x, y) => [0.2 + (1 - clamp01(height.get(x, y)[0])) * 0.25 + inGroove(u, v) * 0.25, 0, 0, 1]);
  const metal = new Layer(TW, THh).paint((u, v) => [1 - inGroove(u, v) * 0.35, 0, 0, 1]);
  group.add(mesh(blade, texturedMaterial('sunSteel', { albedo, rough, metal, height }, { normalStrength: 4 }), 'blade'));

  // Sun-ring guard.
  const brass = texturedMaterial('sunBrass', brassMaps(128, 33));
  const ring = new THREE.TorusGeometry(0.4, 0.055, 16, 80);
  ring.translate(0, -0.02, 0);
  group.add(mesh(ring, brass, 'sunRing'));
  const innerRing = new THREE.TorusGeometry(0.3, 0.018, 12, 96);
  innerRing.translate(0, -0.02, 0.015);
  group.add(mesh(innerRing, brass, 'sunRingInner'));
  // Sunburst rays filling the ring.
  const rays = new THREE.Shape();
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2, rad = k % 2 ? 0.14 : 0.25;
    const p = [Math.cos(a) * rad, Math.sin(a) * rad];
    if (k === 0) rays.moveTo(...p); else rays.lineTo(...p);
  }
  rays.closePath();
  const raysGeo = new THREE.ExtrudeGeometry(rays, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2 });
  raysGeo.translate(0, -0.02, -0.015);
  group.add(mesh(planarUV(raysGeo), brass, 'sunRays'));
  // Blazing core: emissive, the runtime adds bloom + a lens star on it.
  const coreMat = new THREE.MeshStandardMaterial({ name: 'sunCore', color: 0xfff1c9, emissive: 0xffc46b, emissiveIntensity: 4, roughness: 0.2, metalness: 0 });
  const core = new THREE.SphereGeometry(0.1, 32, 20);
  core.scale(1, 1, 0.7);
  core.translate(0, -0.02, 0);
  group.add(mesh(core, coreMat, 'sunCore'));
  // Side flares / dragon-head ends of the guard.
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.3, 0.2, 0), new THREE.Vector3(side * 0.42, 0.3, 0), new THREE.Vector3(side * 0.5, 0.26, 0), new THREE.Vector3(side * 0.53, 0.14, 0),
    ]);
    group.add(mesh(new THREE.TubeGeometry(curve, 48, 0.03, 12, false), brass, 'guardFlare'));
    const knob = new THREE.SphereGeometry(0.045, 24, 16);
    knob.translate(side * 0.53, 0.14, 0);
    group.add(mesh(knob, brass, 'guardKnob'));
  }
  // Collar between guard and grip.
  const collar = new THREE.LatheGeometry([[0, -0.36], [0.075, -0.36], [0.09, -0.4], [0.075, -0.45], [0.06, -0.47], [0, -0.47]].map(([x, y]) => new THREE.Vector2(x, y)), 40);
  group.add(mesh(collar, brass, 'collar'));

  // Wrapped grip + pommel.
  const grip = new THREE.CylinderGeometry(0.058, 0.064, 0.9, 40, 1, true);
  grip.translate(0, -0.92, 0);
  group.add(mesh(grip, texturedMaterial('gripLeather', leatherWrapMaps(128, 256, 44), { normalStrength: 5 }), 'grip'));
  const pommel = new THREE.LatheGeometry([[0, -1.37], [0.07, -1.37], [0.095, -1.42], [0.1, -1.5], [0.08, -1.56], [0.1, -1.6], [0.07, -1.66], [0, -1.67]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
  group.add(mesh(pommel, brass, 'pommel'));
  return group;
}

// ---------------------------------------------------------------------------
// 2. Curved rune dagger
// ---------------------------------------------------------------------------

export function runeDagger() {
  const group = new THREE.Group();
  group.name = 'runeDagger';
  const L = 2.2;
  const cx = t => 0.42 * t ** 2.2;                       // curve toward +x
  const halfW = t => 0.15 + 0.05 * Math.sin(t * Math.PI * 1.4) - 0.08 * t ** 3;
  // Edge outline: right edge up to the hooked tip, serrated left edge back down.
  const shape = new THREE.Shape();
  const N = 120;
  shape.moveTo(cx(0) + halfW(0), 0);
  for (let i = 1; i <= N; i++) { const t = i / N; shape.lineTo(cx(t) + halfW(t) * (1 - t ** 6), t * L); }
  shape.lineTo(cx(1) + 0.28, L + 0.2);                   // hooked point
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    // Sawtooth: ramp out then drop straight back — reads as teeth, not steps.
    const serrate = t > 0.5 && t < 0.86 ? 0.055 * ((t * 26) % 1) : 0;
    shape.lineTo(cx(t) - halfW(t) * (1 - t ** 6) * 0.85 - serrate, t * L);
  }
  shape.closePath();
  const bladeGeo = planarUV(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.06, bevelSegments: 2, curveSegments: 8 }));
  bladeGeo.translate(0, 0, -0.02);

  // Blade textures: battered dark steel with deep scratches and carved glowing runes.
  const r = rng(202);
  const S = 384;
  const height = new Layer(S).paint((u, v) => [0.55 + fbm(u, v, { frequency: 5, seed: 3 }) * 0.35 - fbm(u, v, { frequency: 40, seed: 4 }) * 0.1, 0, 0, 1]);
  for (const line of scratches(r, 120, { angle: r() * Math.PI, spread: 1, length: [0.02, 0.12] })) height.stroke(line, 0.0012 + r() * 0.0012, (px, c) => [px[0] - 0.1 * c, 0, 0, 1]);
  const emissive = new Layer(S, S, [0, 0, 0, 1]);
  // Rune positions follow the blade's centreline in planar UV space.
  const bbox = { minX: -0.2, maxX: cx(1) + 0.28, minY: -0.035, maxY: L + 0.235 };
  const toUV = (x, y) => [(x - bbox.minX) / (bbox.maxX - bbox.minX), (y - bbox.minY) / (bbox.maxY - bbox.minY)];
  for (const t of [0.14, 0.3, 0.46, 0.62]) {
    const [cu, cv] = toUV(cx(t), t * L);
    for (const s of glyph(r)) {
      const pts = s.map(([x, y]) => [cu + (x - 0.5) * 0.12, cv + (y - 0.5) * 0.07]);
      height.stroke(pts, 0.006, (px, c) => [px[0] - 0.5 * c, 0, 0, 1]);
      emissive.stroke(pts, 0.0055, (px, c) => mix(px, [1, 0.42, 0.08, 1], c));
    }
  }
  const halo = new Layer(S, S, [0, 0, 0, 1]);
  halo.data.set(emissive.data);
  halo.blur(6, 2);
  emissive.paint((u, v, x, y, px) => { const h = halo.get(x, y); return [clamp01(px[0] + h[0] * 0.6), clamp01(px[1] + h[1] * 0.6), clamp01(px[2] + h[2] * 0.6), 1]; });
  const albedo = new Layer(S).paint((u, v, x, y) => {
    const h = clamp01(height.get(x, y)[0]);
    const ember = emissive.get(x, y)[0];
    return [...mix(mix([0.16, 0.15, 0.17], [0.42, 0.4, 0.42], h), [0.35, 0.12, 0.05], ember * 0.8), 1];
  });
  const rough = new Layer(S).paint((u, v, x, y) => [0.3 + (1 - clamp01(height.get(x, y)[0])) * 0.45, 0, 0, 1]);
  const metal = new Layer(S, S, [0.9, 0.9, 0.9, 1]);
  group.add(mesh(bladeGeo, texturedMaterial('runeSteel', { albedo, rough, metal, height, emissive }, { normalStrength: 5, emissiveIntensity: 3 }), 'blade'));

  const blackSteel = texturedMaterial('blackSteel', brassMaps(128, 71, [0.12, 0.11, 0.13]));
  // Dark fin along the spine (the flared back of the blade).
  const fin = new THREE.Shape();
  fin.moveTo(cx(0.08) - halfW(0.08) * 0.8, 0.08 * L);
  for (let i = 1; i <= 30; i++) { const t = 0.08 + (i / 30) * 0.42; fin.lineTo(cx(t) - halfW(t) * 0.85 - 0.1 * Math.sin((i / 30) * Math.PI), t * L); }
  fin.lineTo(cx(0.52) - halfW(0.52) * 0.8, 0.53 * L);
  for (let i = 30; i >= 0; i--) { const t = 0.08 + (i / 30) * 0.42; fin.lineTo(cx(t) - halfW(t) * 0.7, t * L); }
  const finGeo = planarUV(new THREE.ExtrudeGeometry(fin, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }));
  finGeo.translate(0, 0, -0.05);
  group.add(mesh(finGeo, blackSteel, 'fin'));

  // Swept guard horns.
  for (const side of [-1, 1]) {
    const horn = new THREE.Shape();
    horn.moveTo(0, 0);
    horn.quadraticCurveTo(side * 0.35, -0.02, side * 0.46, 0.34);
    horn.quadraticCurveTo(side * 0.28, 0.06, 0, 0.1);
    horn.closePath();
    const hornGeo = planarUV(new THREE.ExtrudeGeometry(horn, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2 }));
    hornGeo.translate(0, -0.08, -0.04);
    group.add(mesh(hornGeo, blackSteel, 'guardHorn'));
  }
  const guardBlock = new THREE.BoxGeometry(0.46, 0.12, 0.16, 4, 2, 2);
  guardBlock.translate(0, -0.05, 0);
  group.add(mesh(guardBlock, blackSteel, 'guardBlock'));

  // Riveted wrapped grip.
  const grip = new THREE.CylinderGeometry(0.07, 0.075, 0.78, 36, 1, true);
  grip.translate(0, -0.52, 0);
  group.add(mesh(grip, texturedMaterial('daggerGrip', leatherWrapMaps(128, 256, 91, [0.22, 0.17, 0.16], 10), { normalStrength: 5 }), 'grip'));
  const strap = new THREE.BoxGeometry(0.04, 0.7, 0.02);
  strap.translate(0, -0.52, 0.078);
  group.add(mesh(strap, blackSteel, 'rivetStrap'));
  for (let k = 0; k < 6; k++) {
    const rivet = new THREE.SphereGeometry(0.016, 12, 8);
    rivet.translate(0, -0.22 - k * 0.12, 0.09);
    group.add(mesh(rivet, blackSteel, 'rivet'));
  }
  // Hooked, axe-like pommel.
  const pommel = new THREE.Shape();
  pommel.moveTo(-0.08, 0);
  pommel.lineTo(0.08, 0);
  pommel.quadraticCurveTo(0.34, -0.12, 0.3, -0.42);
  pommel.lineTo(0.18, -0.3);
  pommel.quadraticCurveTo(0.08, -0.2, -0.08, -0.16);
  pommel.closePath();
  const pommelGeo = planarUV(new THREE.ExtrudeGeometry(pommel, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3 }));
  pommelGeo.translate(0, -0.91, -0.035);
  group.add(mesh(pommelGeo, blackSteel, 'pommel'));
  return group;
}

// ---------------------------------------------------------------------------
// 3. Void blade (stylised glowing variant)
// ---------------------------------------------------------------------------

export function voidBlade() {
  const group = new THREE.Group();
  group.name = 'voidBlade';
  const L = 3, W = 0.2, TH = 0.055;
  const blade = loftBlade({
    length: L, maxWidth: W, section: t => {
      const w = W * pointTaper(t, 0.8), th = TH * (1 - t * 0.4);
      return [[w, 0], [w * 0.55, th], [w * 0.12, th * 1.05], [-w * 0.12, th * 1.05], [-w * 0.55, th], [-w, 0]];
    },
  });
  const S = 128, H = 512;
  const height = new Layer(S, H).paint((u, v) => [0.5 + fbm(u, v, { frequency: 4, stretch: [2, 8], seed: 5 }) * 0.3, 0, 0, 1]);
  const emissive = new Layer(S, H).paint((u, v) => {
    // Luminous core channel that thins toward the point, with pulsing runic breaks.
    const width = 0.05 * (1 - v * 0.6);
    const core = smoothstep(width, width * 0.3, Math.abs(u - 0.5)) * smoothstep(0.93, 0.8, v);
    const breaks = 0.75 + 0.25 * Math.sin(v * 90);
    const glowC = [0.25, 0.85, 1];
    return [...glowC.map(c => c * core * breaks), 1];
  });
  const albedo = new Layer(S, H).paint((u, v, x, y) => {
    const h = height.get(x, y)[0], e = emissive.get(x, y)[1];
    return [...mix(mix([0.05, 0.07, 0.12], [0.16, 0.2, 0.3], h), [0.5, 0.9, 1], e), 1];
  });
  const rough = new Layer(S, H).paint((u, v, x, y) => [0.28 + (1 - height.get(x, y)[0]) * 0.2, 0, 0, 1]);
  const metal = new Layer(S, H, [0.85, 0.85, 0.85, 1]);
  group.add(mesh(blade, texturedMaterial('voidSteel', { albedo, rough, metal, height, emissive }, { emissiveIntensity: 3.5 }), 'blade'));

  const darkMetal = texturedMaterial('voidMetal', brassMaps(128, 57, [0.14, 0.16, 0.22]));
  const crystal = new THREE.MeshStandardMaterial({ name: 'voidCrystal', color: 0x9aeaff, emissive: 0x3fd4ff, emissiveIntensity: 3, roughness: 0.05, metalness: 0.1 });
  // Horned guard.
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(side * 0.28, -0.06, 0), new THREE.Vector3(side * 0.5, 0.05, 0), new THREE.Vector3(side * 0.58, 0.3, 0),
    ]);
    const horn = new THREE.TubeGeometry(curve, 64, 0.045, 14, false);
    // Taper the horn toward its tip.
    const p = horn.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const tAlong = Math.floor(i / 15) / 64;
      const pt = curve.getPoint(Math.min(1, tAlong));
      const k = 1 - tAlong * 0.85;
      p.setXYZ(i, pt.x + (p.getX(i) - pt.x) * k, pt.y + (p.getY(i) - pt.y) * k, pt.z + (p.getZ(i) - pt.z) * k);
    }
    horn.computeVertexNormals();
    group.add(mesh(horn, darkMetal, 'guardHorn'));
  }
  const guardCore = new THREE.SphereGeometry(0.12, 40, 28);
  guardCore.scale(1.3, 0.8, 0.7);
  guardCore.translate(0, -0.03, 0);
  group.add(mesh(guardCore, darkMetal, 'guardCore'));
  const guardGem = new THREE.OctahedronGeometry(0.07, 0);
  guardGem.translate(0, -0.03, 0.07);
  group.add(mesh(faceted(guardGem), crystal, 'guardGem'));
  // Grip and crystal pommel.
  const grip = new THREE.CylinderGeometry(0.05, 0.055, 0.8, 32, 1, true);
  grip.translate(0, -0.5, 0);
  group.add(mesh(grip, texturedMaterial('voidGrip', leatherWrapMaps(128, 256, 63, [0.1, 0.11, 0.16], 12), { normalStrength: 5 }), 'grip'));
  const pommelCage = new THREE.TorusGeometry(0.1, 0.02, 12, 48);
  pommelCage.translate(0, -1.02, 0);
  group.add(mesh(pommelCage, darkMetal, 'pommelCage'));
  const pommelGem = new THREE.OctahedronGeometry(0.11, 0);
  pommelGem.scale(0.8, 1.6, 0.8);
  pommelGem.translate(0, -1.08, 0);
  group.add(mesh(faceted(pommelGem), crystal, 'pommelGem'));
  return group;
}
