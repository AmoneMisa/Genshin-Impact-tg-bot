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

import { flaskHtml, potionTone } from '../webapp/inventory.js';
test('potion flasks are tinted by what they restore', () => {
  assert.equal(potionTone({ type: 'hp', bottleType: 'small' }), 'hp');
  assert.equal(potionTone({ type: 'mp', bottleType: 'small' }), 'mp');
  assert.equal(potionTone({ type: 'hp', bottleType: 'elixir' }), 'elixir');
  assert.match(flaskHtml({ type: 'mp' }), /inv-flask tone-mp/);
});

import { clampAmount } from '../webapp/exchange.js';
test('exchange amount stays a whole number within what you can afford', () => {
  assert.equal(clampAmount(3, 120), 3);
  assert.equal(clampAmount(0, 120), 1);
  assert.equal(clampAmount(500, 120), 120);
  assert.equal(clampAmount(2.7, 120), 2);
  assert.equal(clampAmount(5, 0), 0);
});

import { rouletteNames } from '../webapp/titles.js';
test('title roulette flickers through other names and stops on the recipient', () => {
  const names = rouletteNames([{ nickname: 'Lana' }, { nickname: 'Seth' }, { nickname: 'Lana' }, { nickname: 'Kira' }], 'Kira', 6);
  assert.equal(names.at(-1), 'Kira');
  assert.equal(names.length, 7);
  assert.ok(names.slice(0, -1).every(name => name !== 'Kira'));
  assert.equal(rouletteNames([], 'Nero', 3).at(-1), 'Nero');
});

import { signAngle } from '../webapp/horoscope.js';
test('zodiac signs are spaced evenly around the ring', () => {
  assert.equal(signAngle(0), 0);
  assert.equal(signAngle(3), 90);
  assert.equal(signAngle(11), 330);
  assert.equal(signAngle(1, 4), 90);
});
