import test from 'node:test';
import assert from 'node:assert/strict';
import { bannerHtml, gradeTone, GRADE_ORDER } from '../webapp/gacha.js';

test('every grade has a summon colour, rising with rarity', () => {
  for (const grade of GRADE_ORDER) assert.ok(gradeTone(grade));
  assert.equal(gradeTone('S'), 'gold');
  assert.equal(gradeTone('SSS'), 'prism');
  assert.equal(gradeTone('unknown'), 'plain');
});

test('banner shows its painting, rates best-first, shards and the price', () => {
  const html = bannerHtml({ id: 'royal', title: 'Королевская спираль', needLvl: 59, freeSpins: 0, shards: 42, shardsCost: 100, spinCost: { crystals: 170, gold: 55000 }, grades: [{ value: 'A', chance: .75 }, { value: 'SS', chance: .03 }], canRoll: true, paymentMode: 'currency' }, 60);
  assert.match(html, /\/art\/gacha\/royal\.webp/);
  assert.ok(html.indexOf('<b>SS</b>') < html.indexOf('<b>A</b>'));
  assert.match(html, /42 \/ 100/);
  assert.match(html, /💎 170/);
  assert.doesNotMatch(html, /gacha-lock/);
  assert.match(bannerHtml({ id: 'goddess', title: 'x', needLvl: 78, freeSpins: 0, shards: 0, shardsCost: 100, spinCost: {}, grades: [], canRoll: false, paymentMode: 'level_locked' }, 30), /Нужен 78 уровень · у тебя 30/);
});
