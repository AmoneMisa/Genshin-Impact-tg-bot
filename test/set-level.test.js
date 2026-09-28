import test from 'node:test';
import assert from 'node:assert/strict';
import setLevel from '../functions/game/player/setLevel.js';
import levelsTemplate from '../template/levelsTemplate.js';

function session(overrides = {}) {
  return {
    game: {
      stats: { lvl: 1, currentExp: 0, needExp: levelsTemplate[0].needExp },
      inventory: { gold: 0, crystals: 0, ironOre: 0, sp: 0 },
      // no gameClass -> updatePlayerStats() is skipped, keeping this a pure stat-math test
      ...overrides.game,
    },
    ...overrides,
  };
}

test('gaining a level awards skill points and consumes the needed exp', () => {
  const s = session();
  s.game.stats.currentExp = levelsTemplate[0].needExp; // exactly enough for level 1 -> 2

  setLevel(s);

  assert.equal(s.game.stats.lvl, 2);
  assert.equal(s.game.stats.currentExp, 0);
  assert.equal(s.game.inventory.sp, 20);
});

test('not enough exp yet: no level, no SP, needExp is refreshed', () => {
  const s = session();
  s.game.stats.currentExp = 10;

  setLevel(s);

  assert.equal(s.game.stats.lvl, 1);
  assert.equal(s.game.inventory.sp, 0);
  assert.equal(s.game.stats.needExp, levelsTemplate[0].needExp - 10);
});

test('SP accumulates on top of whatever the player already has', () => {
  const s = session();
  s.game.inventory.sp = 500;
  s.game.stats.currentExp = levelsTemplate[0].needExp;

  setLevel(s);

  assert.equal(s.game.inventory.sp, 520);
});
