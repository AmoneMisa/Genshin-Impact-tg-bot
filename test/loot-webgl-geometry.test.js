import test from 'node:test';
import assert from 'node:assert/strict';
import { __geometryForTests as g, fitCameraDistance, recipeBounds, sceneRecipeForKind } from '../webapp/loot-webgl-v2.js';
import { dampFactor, MAX_LIVE_SCENES } from '../webapp/loot-webgl-v4.js';

const kinds = ['sword', 'dagger', 'staff', 'bow', 'crossbow', 'hammer', 'helmet', 'armor', 'gloves', 'greaves', 'boots', 'shield', 'cloak', 'ring', 'amulet', 'relic'];
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('rotation matrices are full 4x4 so model matrices never turn into NaN', () => {
  const m = g.rotationZ(0.7);
  assert.equal(m.length, 16);
  const c = Math.cos(0.7), s = Math.sin(0.7);
  assert.deepEqual(m, [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const composed = g.compose([1, 2, 3], [0.2, 2, 0.1], [0.3, -0.4, 0.5]);
  assert.equal(composed.length, 16);
  assert.ok(composed.every(Number.isFinite));
});

test('every primitive mesh faces outward so back-face culling keeps the visible shell', () => {
  for (const [name, mesh] of Object.entries({ CUBE: g.CUBE, BEVEL: g.BEVEL, WEDGE: g.WEDGE, DIAMOND: g.DIAMOND, CYLINDER: g.CYLINDER, OCTA: g.OCTA })) {
    const p = mesh.positions, n = mesh.normals;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < p.length; i += 3) { cx += p[i]; cy += p[i + 1]; cz += p[i + 2]; }
    const count = p.length / 3; cx /= count; cy /= count; cz /= count;
    for (let t = 0; t < p.length; t += 9) {
      const a = [p[t], p[t + 1], p[t + 2]], b = [p[t + 3], p[t + 4], p[t + 5]], c = [p[t + 6], p[t + 7], p[t + 8]];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const face = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const centroid = [(a[0] + b[0] + c[0]) / 3 - cx, (a[1] + b[1] + c[1]) / 3 - cy, (a[2] + b[2] + c[2]) / 3 - cz];
      assert.ok(face[0] * centroid[0] + face[1] * centroid[1] + face[2] * centroid[2] > 0, `${name} triangle ${t / 9} is wound inward`);
      const vn = [n[t], n[t + 1], n[t + 2]];
      assert.ok(face[0] * vn[0] + face[1] * vn[1] + face[2] * vn[2] > 0, `${name} triangle ${t / 9} normal disagrees with its winding`);
    }
  }
});

test('normal matrix keeps normals perpendicular to surfaces under non-uniform scale', () => {
  const model = g.compose([0, 0, 0], [0.24, 2.08, 0.13], [0.2, 0.5, -0.3]);
  const nm = g.normalMatrix(model, new Array(9));
  // A slanted face of a unit box: tangent (1,1,0), normal (1,-1,0).
  const tangent = [1, 1, 0], normal = [1, -1, 0];
  const t = [0, 1, 2].map(r => model[r] * tangent[0] + model[4 + r] * tangent[1] + model[8 + r] * tangent[2]);
  const n = [0, 1, 2].map(r => nm[r] * normal[0] + nm[3 + r] * normal[1] + nm[6 + r] * normal[2]);
  assert.ok(close(t[0] * n[0] + t[1] * n[1] + t[2] * n[2], 0), 'transformed normal must stay perpendicular');
});

test('auto-framing fits every loot kind inside the view at any rotation', () => {
  for (const kind of kinds) {
    const bounds = recipeBounds(sceneRecipeForKind(kind, { variant: 2 }));
    assert.ok(bounds.radius > 0 && bounds.center.every(Number.isFinite), kind);
    for (const aspect of [0.5, 1, 1.8]) {
      const distance = fitCameraDistance(bounds.radius, aspect);
      const halfY = (34 * Math.PI / 180) / 2, halfX = Math.atan(Math.tan(halfY) * aspect);
      assert.ok(bounds.radius / distance <= Math.sin(Math.min(halfX, halfY)) + 1e-9, `${kind} would clip at aspect ${aspect}`);
    }
  }
  const small = recipeBounds(sceneRecipeForKind('sword', { swordLength: 35 }));
  const large = recipeBounds(sceneRecipeForKind('sword', { swordLength: 180 }));
  assert.ok(large.radius > small.radius, 'longer daily swords get a wider frame');
});

test('ring segments lie tangent in the ring plane instead of pointing at the camera', () => {
  const ring = sceneRecipeForKind('ring').filter(part => part.type === 'cylinder');
  assert.ok(ring.length >= 10);
  for (const part of ring) assert.equal(part.rotation[0], 0);
});

test('easing is frame-rate independent', () => {
  assert.ok(close(dampFactor(0.09, 1 / 60), 0.09));
  const at120 = 1 - (1 - dampFactor(0.09, 1 / 120)) ** 2;
  assert.ok(close(at120, 0.09), 'two 120 Hz frames must ease as far as one 60 Hz frame');
  assert.ok(dampFactor(0.09, 10) < 1, 'a long stall is clamped instead of snapping');
  assert.equal(dampFactor(0.09, 0), 0);
});

test('live 3D scenes stay under the mobile WebGL context budget', () => {
  // Background canvas + the one shared glTF context + procedural scenes must stay
  // well below the ~8 contexts phones allow.
  assert.ok(MAX_LIVE_SCENES + 2 <= 6);
});
