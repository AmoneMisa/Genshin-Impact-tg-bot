import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { particleVectors, rarityTone } from '../webapp/vfx.js';
import { transitionColorForMode } from '../webapp/renderer.js';

const root = process.cwd();

test('game VFX particle layout is deterministic and bounded', () => {
  const vectors = particleVectors(16);
  assert.equal(vectors.length, 16);
  assert.deepEqual(vectors, particleVectors(16));
  assert.ok(vectors.every(({ x, y, delay, size }) => Math.abs(x) <= 70 && Math.abs(y) <= 70 && delay >= 0 && size >= 3 && size <= 5));
});

test('rarity and screen modes map to stable visual tones', () => {
  assert.equal(rarityTone('SSS'), 'prismatic');
  assert.equal(rarityTone('S'), 'gold');
  assert.equal(rarityTone('A'), 'arcane');
  assert.equal(rarityTone('unknown'), 'arcane');
  assert.deepEqual(transitionColorForMode('boss'), [1, 0.22, 0.22]);
  assert.deepEqual(transitionColorForMode('builds'), [0.86, 0.63, 0.27]);
  assert.deepEqual(transitionColorForMode('missing'), transitionColorForMode('default'));
});

test('VFX stylesheet is wired before design system and stays out of layout flow', () => {
  const index = fs.readFileSync(path.join(root, 'webapp/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'webapp/vfx.css'), 'utf8');
  const stylesheets = [...index.matchAll(/href="\/([^"]+\.css)"/g)].map(match => match[1]);
  assert.ok(stylesheets.includes('vfx.css'));
  assert.ok(stylesheets.indexOf('vfx.css') < stylesheets.indexOf('design-system.css'));
  assert.equal(stylesheets.at(-1), 'design-system.css');
  assert.ok(css.includes('pointer-events: none'));
  assert.ok(css.includes('position: absolute'));
  assert.ok(css.includes('@media (max-width: 390px)'));
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
});

test('WebGL renderer exposes a real shader transition and app triggers it per feature', () => {
  const renderer = fs.readFileSync(path.join(root, 'webapp/renderer.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'webapp/app.js'), 'utf8');
  assert.ok(renderer.includes('uniform float u_transition'));
  assert.ok(renderer.includes('uniform vec3 u_transition_color'));
  assert.ok(renderer.includes('transitionRing'));
  assert.ok(renderer.includes("transition(mode = 'default')"));
  assert.ok(renderer.includes('prefers-reduced-motion: reduce'));
  assert.ok(app.includes("import { startGameVfx } from './vfx.js'"));
  assert.ok(app.includes('webglFx?.transition?.(feature.id)'));
  assert.ok(app.includes('startGameVfx()'));
});
