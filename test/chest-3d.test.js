import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LID_OPEN_ANGLE, RATTLE_SECONDS, SWING_SECONDS, glowLevel, lidAngle } from '../webapp/chest-3d.js';

test('the lid stays shut through the rattle, then swings open with a small overshoot', () => {
  assert.equal(lidAngle(0), 0);
  assert.equal(lidAngle(RATTLE_SECONDS), 0);
  let peak = 0;
  for (let t = RATTLE_SECONDS; t <= RATTLE_SECONDS + SWING_SECONDS; t += 0.01) peak = Math.max(peak, lidAngle(t));
  assert.ok(peak > LID_OPEN_ANGLE && peak < LID_OPEN_ANGLE * 1.15, 'overshoots a little past open');
  assert.ok(Math.abs(lidAngle(RATTLE_SECONDS + SWING_SECONDS) - LID_OPEN_ANGLE) < 1e-9, 'settles fully open');
});

test('treasure chests glow as they open; empty ones stay dark', () => {
  assert.equal(glowLevel(0.1, false), 0);
  assert.ok(glowLevel(RATTLE_SECONDS + 0.35, false) > 1);
  assert.equal(glowLevel(RATTLE_SECONDS + 0.35, true), 0);
});

test('the chest model has the nodes the animation drives', () => {
  const buffer = fs.readFileSync('webapp/models/chest.glb');
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)));
  const names = json.nodes.map(node => node.name);
  for (const name of ['body', 'lid', 'glow', 'treasure']) assert.ok(names.includes(name), name);
  // The lid's origin must sit on the hinge (back top edge), not the model centre.
  const lid = json.nodes.find(node => node.name === 'lid');
  assert.ok(lid.translation && lid.translation[1] > 0.3, 'lid pivot is raised to the rim');
});

test('each baked material keeps its own colour texture (multi-material bake regression)', () => {
  const buffer = fs.readFileSync('webapp/models/chest.glb');
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)));
  for (const name of ['chestWood', 'chestBrass']) {
    const mat = json.materials.find(m => m.name === name);
    const tex = json.textures[mat.pbrMetallicRoughness.baseColorTexture.index];
    assert.match(json.images[tex.source].name, new RegExp(`^${name}_color`));
  }
});
