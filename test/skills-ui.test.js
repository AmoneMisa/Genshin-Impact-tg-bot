import test from 'node:test';
import assert from 'node:assert/strict';
import { enchantPips, SKILL_RUNES } from '../webapp/skills.js';

test('enchant pips fill up to the level and mark the newest one', () => {
  const html = enchantPips(3, 5);
  assert.equal((html.match(/class="on/g) || []).length, 3);
  assert.equal((html.match(/<i/g) || []).length, 5);
  assert.equal((html.match(/ last/g) || []).length, 1);
  assert.doesNotMatch(enchantPips(0, 3), /on|last/);
  assert.equal((enchantPips(9, 3).match(/class="on/g) || []).length, 3);
  for (const kind of ['damage', 'heal', 'shield', 'utility']) assert.ok(SKILL_RUNES[kind]);
});
