import test from 'node:test';
import assert from 'node:assert/strict';
import elementsTemplate from '../template/elements.js';
import { ELEMENT_RING, elementChip, elementTone } from '../webapp/elements.js';

test('every server element has its own colour and appears on the altar ring', () => {
  const tones = elementsTemplate.map(elementTone);
  assert.ok(!tones.includes('neutral'));
  assert.equal(new Set(tones).size, elementsTemplate.length);
  assert.deepEqual([...ELEMENT_RING].sort(), [...elementsTemplate].sort());
  assert.equal(elementTone('??'), 'neutral');
  assert.match(elementChip('🔥 Пиро', 'large'), /el-chip tone-pyro large/);
});

import { lootBurst } from '../webapp/steal.js';
test('heist loot burst shows what was actually stolen', () => {
  assert.deepEqual(lootBurst({ gold: 10, crystals: 0, ironOre: 0 }), ['🪙', '🪙', '🪙', '🪙']);
  assert.ok(lootBurst({ gold: 0, crystals: 5, ironOre: 1 }).includes('⛏️'));
  assert.deepEqual(lootBurst({}), ['✦']);
});
