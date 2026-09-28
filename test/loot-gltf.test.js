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
      ring: { file: 'ring.glb', variants: { S: 'ring-s.glb', SS: '../nope.glb' }, scale: -2 },
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
  const manifest = normalizeManifest({ models: { sword: { file: 'sword.glb', variants: { SSS: 'sword-sss.glb' } } } });
  assert.equal(resolveModelEntry(manifest, { kind: 'sword', grade: 'SSS' }).url, '/models/sword-sss.glb');
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
  assert.ok(glow('D') < glow('A') && glow('A') < glow('S') && glow('S') < glow('SSS'));
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

test('shipped models pass the validator and stay inside the phone budget', () => {
  const { errors, warnings, rows } = checkModels(path.join(root, 'webapp/models'));
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.ok(rows.length >= 4);
  for (const row of rows) assert.ok(row.triangles > 5000, `${row.file} should be high-poly`);
  assert.match(inspectGlb(Buffer.from('not a model at all')).error, /not a binary glTF/);
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
  assert.equal(canonicalGrade('sss'), 'SSS');
  assert.equal(canonicalGrade('nograde'), 'noGrade');
  assert.equal(canonicalGrade('???'), 'noGrade');
  const manifest = normalizeManifest({ models: { sword: { file: 'sword.glb', variants: { SSS: 'sword-sss.glb' } } } });
  assert.equal(resolveModelEntry(manifest, { kind: 'sword', grade: 'sss' }).url, '/models/sword-sss.glb');
  assert.equal(materialAdjustments({ grade: 'sss' }).glow, materialAdjustments({ grade: 'SSS' }).glow);
});

test('textured sample weapons embed PBR texture maps and glowing parts', async () => {
  const buffer = fs.readFileSync(path.join(root, 'webapp/models/sword.glb'));
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)));
  assert.ok((json.images || []).length >= 4, 'albedo, packed roughness/metal, normal and more');
  assert.ok(json.images.every(image => image.mimeType === 'image/png'));
  const blade = json.materials.find(m => m.name === 'sunSteel');
  assert.ok(blade.pbrMetallicRoughness.baseColorTexture && blade.pbrMetallicRoughness.metallicRoughnessTexture && blade.normalTexture);
  assert.ok(json.materials.some(m => m.emissiveFactor?.some(v => v > 0)), 'sun core glows');
  const dagger = fs.readFileSync(path.join(root, 'webapp/models/dagger.glb'));
  const daggerJson = JSON.parse(dagger.toString('utf8', 20, 20 + dagger.readUInt32LE(12)));
  assert.ok(daggerJson.materials.some(m => m.emissiveTexture), 'carved runes use an emissive map');
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
