// Generates sample high-poly .glb models into webapp/models/ so the glTF
// pipeline works out of the box. These are placeholders: replace any file with a
// real artist-made model (same file name) or point manifest.json at a new one.
//
//   node scripts/models/buildSampleModels.js
//
// Models are authored Y-up and centred roughly on the origin; the runtime
// re-centres and normalises scale anyway (see webapp/loot-gltf.js).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { installCanvasShim } from './texture.js';
import { runeDagger, sunSword, voidBlade } from './weapons.js';
import { butterflyNecklace, crescentEarring, filigreeRing, flowerTiara, wingedRing } from './jewelry.js';
import { celestialBow, runeCrossbow, spikedKnuckles, warHammer } from './arsenal.js';

installCanvasShim();

// GLTFExporter assembles the binary via FileReader, which Node doesn't have.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); }); }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(buffer => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../webapp/models');

// ---- materials (emissive only where the runtime should apply the grade glow) ----
const steel = () => new THREE.MeshStandardMaterial({ name: 'steel', color: 0xc9d2de, metalness: 1, roughness: 0.24 });
const darkSteel = () => new THREE.MeshStandardMaterial({ name: 'darkSteel', color: 0x5d6675, metalness: 1, roughness: 0.38 });
const gold = () => new THREE.MeshStandardMaterial({ name: 'gold', color: 0xd9a84e, metalness: 1, roughness: 0.3 });
const leather = () => new THREE.MeshStandardMaterial({ name: 'leather', color: 0x4b2d20, metalness: 0, roughness: 0.82 });
const wood = () => new THREE.MeshStandardMaterial({ name: 'wood', color: 0x5e3b25, metalness: 0, roughness: 0.68 });
const enamel = () => new THREE.MeshStandardMaterial({ name: 'enamel', color: 0x243a6e, metalness: 0.55, roughness: 0.42 });
const gem = color => new THREE.MeshStandardMaterial({ name: 'gem', color, emissive: color, emissiveIntensity: 1.4, metalness: 0.1, roughness: 0.08 });
const rune = color => new THREE.MeshStandardMaterial({ name: 'rune', color: 0x111111, emissive: color, emissiveIntensity: 1.8, metalness: 0, roughness: 0.5 });

const mesh = (geometry, material, name) => Object.assign(new THREE.Mesh(geometry, material), { name });

// Faceted gems read as cut stones: flat normals per facet.
function facetedGem(radius, detail = 0) {
  const g = new THREE.IcosahedronGeometry(radius, detail); // already non-indexed: one normal per facet
  g.computeVertexNormals();
  return g;
}

// Lathe profile helper: [[radius, y], ...] → smooth revolved surface.
const lathe = (profile, segments = 48) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);

// Heater-shield silhouette as functions so the face can be a dense grid (smooth
// bowing and reflections) and the rim can follow exactly the same edge.
const SHIELD_TOP = 1.015, SHIELD_BOTTOM = -1.3, SHIELD_HALF = 0.9;
const shieldHalfWidth = y => (y >= 0.2 ? SHIELD_HALF : SHIELD_HALF * Math.max(0, 1 - ((0.2 - y) / 1.5) ** 2.2));
const shieldTop = x => 0.95 + 0.065 * (1 - (x / SHIELD_HALF) ** 2);
const shieldBow = x => 0.22 * (1 - (x / 0.95) ** 2);

function shieldFace(thickness = 0.07, nu = 56, nv = 84) {
  const positions = [], indices = [];
  const vertex = (u, v, z0, side) => {
    let y = SHIELD_BOTTOM + v * (SHIELD_TOP - SHIELD_BOTTOM);
    const x = u * shieldHalfWidth(y);
    y = Math.min(y, shieldTop(x));
    positions.push(x, y, z0 + shieldBow(x) * side);
  };
  // Front and back sheets; the gold rim tube hides the seam between them.
  for (const [z0, flip] of [[thickness / 2, false], [-thickness / 2, true]]) {
    const base = positions.length / 3;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) vertex((i / nu) * 2 - 1, j / nv, z0, 1);
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      if (flip) indices.push(a, c, b, b, c, d); else indices.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function shieldOutline(samples = 90) {
  const pts = [];
  const bottomRise = [];
  for (let k = 0; k <= samples; k++) bottomRise.push(SHIELD_BOTTOM + (k / samples) * (0.95 - SHIELD_BOTTOM));
  for (const y of bottomRise) pts.push([shieldHalfWidth(y), y]);
  for (let k = 1; k < samples; k++) { const x = SHIELD_HALF - (k / samples) * 2 * SHIELD_HALF; pts.push([x, shieldTop(x)]); }
  for (const y of [...bottomRise].reverse()) pts.push([-shieldHalfWidth(y), y]);
  // Drop the duplicate bottom point (both edges meet at the tip).
  pts.pop();
  return pts.map(([x, y]) => new THREE.Vector3(x, y, shieldBow(x)));
}

function shield() {
  const group = new THREE.Group();
  group.name = 'shield';
  group.add(mesh(shieldFace(), enamel(), 'face'));
  const rimCurve = new THREE.CatmullRomCurve3(shieldOutline(), true);
  group.add(mesh(new THREE.TubeGeometry(rimCurve, 360, 0.055, 16, true), gold(), 'rim'));

  // Emblem: raised gold diamond with a gem boss, following the bow.
  const emblem = new THREE.Shape();
  emblem.moveTo(0, 0.55); emblem.lineTo(0.34, 0); emblem.lineTo(0, -0.62); emblem.lineTo(-0.34, 0); emblem.closePath();
  const emblemGeo = new THREE.ExtrudeGeometry(emblem, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.025, bevelSegments: 3 });
  emblemGeo.translate(0, 0, 0.035 + shieldBow(0) - 0.01);
  group.add(mesh(emblemGeo, gold(), 'emblem'));
  const boss = new THREE.SphereGeometry(0.16, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  boss.rotateX(Math.PI / 2);
  boss.translate(0, 0, 0.3);
  group.add(mesh(boss, darkSteel(), 'boss'));
  const bossGem = facetedGem(0.075, 1);
  bossGem.translate(0, 0, 0.45);
  group.add(mesh(bossGem, gem(0xff9f45), 'bossGem'));
  return group;
}

function staff() {
  const group = new THREE.Group();
  group.name = 'staff';

  // Slightly tapered shaft with a knotted lower end.
  const shaft = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    shaft.push([0.05 + 0.012 * (1 - t) + 0.006 * Math.sin(t * 40) * (t < 0.15 ? 1 : 0), -1.9 + t * 3.1]);
  }
  shaft.unshift([0, -1.92]);
  group.add(mesh(lathe(shaft, 32), wood(), 'shaft'));

  for (const y of [-1.2, -0.2, 0.9]) {
    const band = new THREE.TorusGeometry(0.066, 0.018, 16, 48);
    band.rotateX(Math.PI / 2);
    band.translate(0, y, 0);
    group.add(mesh(band, gold(), 'band'));
  }

  // Head: three swept prongs cradling an orb.
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const pts = [0, 0.25, 0.5, 0.75, 1].map(t => {
      const r = 0.05 + Math.sin(t * Math.PI) * 0.3;
      return new THREE.Vector3(dir.x * r, 1.2 + t * 0.62, dir.z * r);
    });
    group.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.028, 12, false), gold(), 'prong'));
  }
  const orb = new THREE.SphereGeometry(0.2, 64, 48);
  orb.translate(0, 1.5, 0);
  group.add(mesh(orb, gem(0x9a6bff), 'orb'));
  const halo = new THREE.TorusGeometry(0.3, 0.012, 12, 96);
  halo.rotateX(Math.PI / 2.4);
  halo.translate(0, 1.5, 0);
  group.add(mesh(halo, rune(0xb28cff), 'halo'));
  return group;
}

function ring() {
  const group = new THREE.Group();
  group.name = 'ring';
  const band = new THREE.TorusGeometry(0.5, 0.085, 48, 160);
  band.scale(1, 1, 1.25);
  group.add(mesh(band, gold(), 'band'));
  // Prong setting + brilliant-cut stone.
  const setting = lathe([[0, 0.5], [0.09, 0.52], [0.14, 0.6], [0.15, 0.66], [0.12, 0.68]], 48);
  group.add(mesh(setting, gold(), 'setting'));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const prong = new THREE.CapsuleGeometry(0.018, 0.14, 4, 10);
    prong.translate(Math.cos(a) * 0.13, 0.72, Math.sin(a) * 0.13);
    group.add(mesh(prong, gold(), 'prong'));
  }
  const stone = new THREE.OctahedronGeometry(0.15, 0);
  stone.scale(1, 0.8, 1);
  stone.computeVertexNormals();
  stone.translate(0, 0.78, 0);
  group.add(mesh(stone, gem(0xff5c93), 'stone'));
  return group;
}

function exportGlb(object) {
  const scene = new THREE.Scene();
  scene.add(object);
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(scene, result => resolve(Buffer.from(result)), reject, { binary: true, maxTextureSize: 1024 });
  });
}

function triangleCount(object) {
  let tris = 0;
  object.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return Math.round(tris);
}

// File name → builder. `sword-sss` is the high-grade variant (see manifest.json).
export const SAMPLE_MODELS = {
  sword: sunSword, dagger: runeDagger, 'sword-sss': voidBlade, shield, staff, ring,
  bow: celestialBow, crossbow: runeCrossbow, hammer: warHammer, knuckles: spikedKnuckles,
  'ring-filigree': filigreeRing, 'ring-winged': wingedRing, necklace: butterflyNecklace, earring: crescentEarring, tiara: flowerTiara,
};

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, build] of Object.entries(SAMPLE_MODELS)) {
    const object = build();
    const glb = await exportGlb(object);
    fs.writeFileSync(path.join(OUT_DIR, `${name}.glb`), glb);
    console.log(`${name}.glb  ${(glb.length / 1024).toFixed(0)} KB  ${triangleCount(object).toLocaleString('en')} triangles`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exit(1); });
}
