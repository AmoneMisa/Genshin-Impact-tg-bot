import test from 'node:test';
import assert from 'node:assert/strict';
import { landingRotation, wheelSegments } from '../webapp/bonus.js';
import { rulerTicks } from '../webapp/sword.js';

const PRIZES = [{ name: 'gold', chance: 40 }, { name: 'crystals', chance: 40 }, { name: 'ironOre', chance: 20 }];

test('wheel segments follow prize chances and never repeat side by side', () => {
  const segments = wheelSegments(PRIZES);
  assert.equal(segments.length, 10);
  assert.equal(segments.filter(name => name === 'gold').length, 4);
  assert.equal(segments.filter(name => name === 'ironOre').length, 2);
  segments.forEach((name, i) => { if (i) assert.notEqual(name, segments[i - 1]); });
});

test('the wheel stops with the won prize under the top pointer', () => {
  const segments = wheelSegments(PRIZES);
  const size = 360 / segments.length;
  for (const name of ['gold', 'crystals', 'ironOre']) {
    for (const r of [0, 0.3, 0.99]) {
      const deg = landingRotation(segments, name, { from: 1234, random: () => r });
      assert.ok(deg > 1234 + 360 * 4, 'spins forward several turns');
      const top = segments.findIndex((_, i) => {
        const a = (((i + 0.5) * size + deg) % 360 + 360) % 360;
        return a < size / 2 || a > 360 - size / 2;
      });
      assert.equal(segments[top], name);
    }
  }
});

test('sword ruler brackets the current length in 10 mm steps', () => {
  const ticks = rulerTicks(142);
  assert.ok(ticks[0].mm >= 142 + 40 && ticks.at(-1).mm <= 142 - 40);
  assert.ok(ticks.every(t => t.mm % 10 === 0));
  assert.ok(ticks.filter(t => t.label).every(t => t.mm % 50 === 0));
  assert.ok(rulerTicks(5).every(t => t.mm >= 0));
});
