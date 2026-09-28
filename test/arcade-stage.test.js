import test from 'node:test';
import assert from 'node:assert/strict';
import { dartRadius, dieRotation, stageHtml, throwOutcome } from '../webapp/arcade-stage.js';
import { rulesText, statPanels } from '../webapp/arcade.js';

test('throw outcomes follow the server roll', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(v => throwOutcome('basketball', v, 5)), ['miss', 'miss', 'rim', 'hit', 'hit']);
  assert.deepEqual([1, 2, 3, 5].map(v => throwOutcome('football', v, 5)), ['miss', 'post', 'hit', 'hit']);
  assert.equal(throwOutcome('darts', 6, 6), 'bull');
  assert.equal(throwOutcome('darts', 1, 6), 'miss');
  assert.equal(throwOutcome('bowling', 6, 6), 'strike');
  assert.equal(throwOutcome('dice', 4, 6), 'roll');
});

test('darts land closer to the bull for higher rolls', () => {
  assert.equal(dartRadius(6), 0);
  assert.ok(dartRadius(1) > 1, 'a 1 misses the board');
  assert.ok(dartRadius(5) < dartRadius(3));
});

test('every die face has a rotation that shows it', () => {
  const seen = new Set();
  for (let face = 1; face <= 6; face += 1) seen.add(dieRotation(face).join());
  assert.equal(seen.size, 6);
  assert.deepEqual(dieRotation(1), [0, 0]);
});

test('each game renders its own scene and the die keeps the last face', () => {
  assert.match(stageHtml('basketball'), /as-hoop[^>]*data-target/);
  assert.match(stageHtml('football'), /as-goal[^>]*data-target/);
  assert.match(stageHtml('darts'), /as-dartboard/);
  assert.equal((stageHtml('bowling').match(/as-pin p/g) || []).length, 6);
  assert.equal((stageHtml('slots', { reels: ['👻', '💋', '👽'] }).match(/data-reel/g) || []).length, 3);
  assert.match(stageHtml('dice', { lastValue: 2 }), /--rx:0deg;--ry:-90deg/);
});

test('rules and stat panels describe the round', () => {
  const game = { mode: 'score', maxRolls: 3, maxValue: 5, winRange: { min: 12, max: 15 }, score: 13, rolls: 3 };
  assert.match(rulesText(game), /3 броска по 1–5.*12–15/);
  assert.match(statPanels(game), /arcade-stat good/);
  assert.match(statPanels({ ...game, score: 16 }), /arcade-stat bad/);
  assert.match(statPanels({ mode: 'slots', bet: 100, winChance: .2, payoutMultiplier: 1.5 }), /20%[\s\S]*×1.5/);
});
