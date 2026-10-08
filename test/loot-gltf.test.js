import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  fitDistance,
  loadModelManifest,
  materialAdjustments,
  normalizeManifest,
  resolveModelEntry,
  revealScale,
} from '../webapp/loot-gltf.js';
import { checkModels, inspectGlb } from '../scripts/models/checkModels.js';

const root = process.cwd();

test('manifest normalization drops unsafe paths and bad kinds', () => {
  const manifest = normalizeManifest({
    models: {
      sword: { file: 'sword.glb', rotation: [90, 0, 0], scale: 0.8 },
      shield: 'shield.glb',
      escape: { file: '../server.js' },
      absolute: { file: '/etc/passwd.glb' },
      binary: { file: 'payload.exe' },
      'Bad Kind': { file: 'x.glb' },
      ring: { file: 'ring.glb', variants: { S: 'ring-s.glb', S80: '../nope.glb' }, scale: -2 },
    },
  });
  assert.deepEqual(Object.keys(manifest.models).sort(), ['ring', 'shield', 'sword']);
  assert.ok(Math.abs(manifest.models.sword.rotation[0] - Math.PI / 2) < 1e-9, 'degrees become radians');
  assert.equal(manifest.models.sword.scale, 0.8);
  assert.equal(manifest.models.ring.scale, 1, 'non-positive scale falls back to 1');
  assert.deepEqual(manifest.models.ring.variants, { S: 'ring-s.glb' });
  assert.equal(manifest.models.shield.tint, true);
  assert.deepEqual(normalizeManifest(null).models, {});
});

test('model resolution prefers a grade variant and falls back to the kind default', () => {
  const manifest = normalizeManifest({ models: { sword: { file: 'sword.glb', variants: { S84: 'sword-s84.glb' } } } });
  assert.equal(resolveModelEntry(manifest, { kind: 'sword', grade: 'S84' }).url, '/models/sword-s84.glb');
  assert.equal(resolveModelEntry(manifest, { kind: 'sword', grade: 'D' }).url, '/models/sword.glb');
  assert.equal(resolveModelEntry(manifest, { kind: 'hammer' }), null);
});

test('item condition maps onto PBR parameters in the right direction', () => {
  const fresh = materialAdjustments({ quality: 1, durability: 1 });
  const worn = materialAdjustments({ quality: 1, durability: 0.2 });
  const shoddy = materialAdjustments({ quality: 0.1, durability: 1 });
  assert.ok(worn.roughnessAdd > fresh.roughnessAdd && worn.colorMul < fresh.colorMul, 'worn gear is rougher and darker');
  assert.ok(shoddy.envIntensity < fresh.envIntensity, 'low quality reflects less');
  const glow = grade => materialAdjustments({ grade }).glow;
  assert.ok(glow('D') < glow('A') && glow('A') < glow('S') && glow('S') < glow('S84'));
  assert.equal(glow('unknown'), glow('noGrade'));
});

test('glTF framing keeps the model sphere in view and the reveal settles at full size', () => {
  for (const aspect of [0.5, 1, 2]) {
    const d = fitDistance(1, aspect, 30);
    const halfY = Math.PI / 12, halfX = Math.atan(Math.tan(halfY) * aspect);
    assert.ok(1 / d <= Math.sin(Math.min(halfX, halfY)));
  }
  assert.ok(Math.abs(revealScale(0)) < 1e-9);
  assert.equal(revealScale(5), 1);
  assert.ok(revealScale(0.55) > 1, 'reveal overshoots slightly before settling');
});

test('a missing or broken manifest degrades to "no models" instead of throwing', async () => {
  const manifest = await loadModelManifest(() => Promise.reject(new Error('offline')));
  assert.deepEqual(manifest.models, {});
});

test('model manifest is retired and no GLB ships', () => {
  const {errors,warnings,rows}=checkModels(path.join(root,'webapp/models'));
  assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.deepEqual(rows,[]);
  assert.deepEqual(fs.readdirSync(path.join(root,'webapp/models')).filter(f=>f.endsWith('.glb')),[]);
  assert.match(inspectGlb(Buffer.from('not a model at all')).error,/not a binary glTF/);
});

test('three.js is pinned and served locally through an import map', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(pkg.dependencies.three, /^\d+\.\d+\.\d+$/, 'three must be pinned to an exact version');
  const index = fs.readFileSync(path.join(root, 'webapp/index.html'), 'utf8');
  const importMap = index.indexOf('type="importmap"');
  assert.ok(importMap > 0 && importMap < index.indexOf('type="module"'), 'import map must precede module scripts');
  assert.ok(index.includes('"three":"/vendor/three/build/three.module.min.js"'));
  const server = fs.readFileSync(path.join(root, 'miniapp/server.js'), 'utf8');
  assert.ok(server.includes("THREE_PUBLIC_PREFIXES = ['build/', 'examples/jsm/']"));
  assert.ok(server.includes("'.glb': 'model/gltf-binary'"));
  assert.ok(server.includes("requestUrl.pathname.startsWith('/models/')"), 'missing models must 404, not fall back to index.html');
});

test('grades from the DOM (lowercase) resolve variants and glow like canonical grades', async () => {
  const { canonicalGrade } = await import('../webapp/loot-gltf.js');
  assert.equal(canonicalGrade('s84'), 'S84');
  assert.equal(canonicalGrade('nograde'), 'noGrade');
  assert.equal(canonicalGrade('???'), 'noGrade');
  const manifest = normalizeManifest({ models: { sword: { file: 'sword.glb', variants: { S84: 'sword-s84.glb' } } } });
  assert.equal(resolveModelEntry(manifest, { kind: 'sword', grade: 's84' }).url, '/models/sword-s84.glb');
  assert.equal(materialAdjustments({ grade: 's84' }).glow, materialAdjustments({ grade: 'S84' }).glow);
});

test('equipment never boots the legacy 3D item renderer', () => {
  const renderer=fs.readFileSync(path.join(root,'webapp/renderer.js'),'utf8');
  assert.doesNotMatch(renderer,/startLootWebGL|loot-webgl/);
  const art=fs.readFileSync(path.join(root,'webapp/loot-renderer.js'),'utf8');
  assert.doesNotMatch(art,/<svg|<canvas|\\.glb/);
  assert.match(art,/loot-item-image/);
});

test('the PNG encoder produces a valid, decodable image', async () => {
  const zlib = await import('node:zlib');
  const { encodePng } = await import('../scripts/models/texture.js');
  const px = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 10, 20, 30, 255]);
  const png = encodePng(2, 2, px);
  assert.equal(png.toString('latin1', 1, 4), 'PNG');
  const idatLength = png.readUInt32BE(33);
  const raw = zlib.inflateSync(png.subarray(41, 41 + idatLength));
  // Row 1, "Sub" filter: second pixel is stored as the delta from the first.
  assert.deepEqual([...raw.subarray(0, 7)], [1, 255, 0, 0, (0 - 255) & 0xff, 255, 0]);
});
