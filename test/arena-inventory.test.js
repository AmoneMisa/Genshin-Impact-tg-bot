import test from 'node:test';
import assert from 'node:assert/strict';
import pvpSignTemplate from '../template/pvpSignTemplate.js';
import {
  getArenaMedalUpgradeState,
  grantArenaMedal,
  normalizeArenaInventory,
  upgradeArenaMedal,
} from '../functions/game/arena/arenaInventory.js';

function game(tokens = 0) {
  return {
    inventory: {
      arena: {
        name: 'Предметы арены',
        items: [{ tokens }, { pvpSign: null }],
      },
    },
  };
}

test('arena medal first upgrade spends tokens and advances one level', () => {
  const state = game(1000);
  grantArenaMedal(state, 100);

  const preview = getArenaMedalUpgradeState(state);
  assert.equal(preview.ok, true);
  assert.equal(preview.currentLevel, 1);
  assert.equal(preview.nextLevel, 2);
  assert.equal(preview.cost, 180);
  assert.equal(preview.canAfford, true);

  const upgraded = upgradeArenaMedal(state);
  assert.equal(upgraded.ok, true);
  assert.equal(upgraded.level, 2);
  assert.equal(upgraded.tokens, 820);
  assert.equal(normalizeArenaInventory(state).pvpSign.effects[0].value, 1.07);
});

test('arena medal upgrade rejects insufficient tokens without mutation', () => {
  const state = game(10);
  grantArenaMedal(state, 100);
  const before = JSON.stringify(state.inventory.arena);

  const result = upgradeArenaMedal(state);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_enough_tokens');
  assert.equal(JSON.stringify(state.inventory.arena), before);
});

test('legacy skipped medal continues from stronger current effects without downgrade', () => {
  const state = game(5000);
  const arena = normalizeArenaInventory(state);
  arena.pvpSign = JSON.parse(JSON.stringify(pvpSignTemplate));
  arena.pvpSign.lvl = 2;
  arena.pvpSign.effects = JSON.parse(JSON.stringify(pvpSignTemplate.upgrades[2].effects));
  arena.items[1] = { pvpSign: arena.pvpSign };

  const preview = getArenaMedalUpgradeState(state);
  assert.equal(preview.ok, true);
  assert.equal(preview.upgradeIndex, 3);
  assert.equal(preview.nextLevel, 5);
  assert.equal(preview.effects[0].value, 1.1);

  const result = upgradeArenaMedal(state);
  assert.equal(result.ok, true);
  assert.equal(result.level, 5);
  assert.equal(normalizeArenaInventory(state).pvpSign.effects[0].value, 1.1);
});
