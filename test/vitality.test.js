import test from 'node:test';
import assert from 'node:assert/strict';
import { EXP_RATE, MAX_LEVEL, VITALITY_MAX, gainExp, getVitalityState, readVitality, stageOf } from '../functions/game/player/vitality.js';
import setLevel, { clampLevel } from '../functions/game/player/setLevel.js';
import levelsTemplate from '../template/levelsTemplate.js';

const player = (lvl = 10, extra = {}) => ({ game: { stats: { lvl, currentExp: 0, needExp: 1500 }, inventory: { sp: 0 }, ...extra } });

test('the level cap is 85 and the curve ends there', () => {
  assert.equal(MAX_LEVEL, 85);
  assert.equal(levelsTemplate.at(-1).lvl, 84);
  const capped = player(85);
  capped.game.stats.currentExp = 10 ** 9;
  setLevel(capped);
  assert.equal(capped.game.stats.lvl, 85);
  assert.equal(capped.game.stats.currentExp, 0);

  const old = player(97);
  assert.equal(clampLevel(old), true);
  assert.equal(old.game.stats.lvl, 85);
});

test('experience is x5 with the Vitality bonus on top, and the bar drains and refills', () => {
  const session = player(10);
  const now = 1_000_000;
  assert.equal(getVitalityState(session, now).points, VITALITY_MAX, 'a new character has a full bar');
  const first = gainExp(session, 1000, { now });
  assert.equal(first.bonus, 3);
  assert.equal(first.gained, 1000 * EXP_RATE * 3);
  assert.equal(session.game.stats.currentExp, 15000);
  assert.ok(readVitality(session, now).points < VITALITY_MAX);

  // An empty bar still gives the plain x5 rate; a day later it is full again.
  session.game.vitality = { points: 0, at: now };
  assert.equal(gainExp(session, 100, { now }).gained, 100 * EXP_RATE);
  assert.equal(stageOf(0).bonus, 1);
  assert.equal(readVitality(session, now + 24 * 3600 * 1000).points, VITALITY_MAX);
  assert.ok(stageOf(5000).bonus > stageOf(500).bonus);
});

test('nothing is earned at the maximum level', () => {
  const session = player(85);
  assert.deepEqual(gainExp(session, 5000), { gained: 0, bonus: 1 });
  assert.equal(session.game.stats.currentExp, 0);
});
