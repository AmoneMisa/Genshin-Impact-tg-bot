import test from 'node:test';
import assert from 'node:assert/strict';
import { getGachaState, rollGacha, resolveGacha } from '../miniapp/gacha.js';

function session(overrides = {}) {
  const base = {
    game: {
      stats: { lvl: 100 },
      inventory: {
        gold: 1_000_000,
        crystals: 10_000,
        gacha: { name: 'Предметы гачи', items: [] },
        equipment: { name: 'Экипировка', items: [] },
      },
      gacha: [],
      gachaTempItem: null,
      gachaTempType: null,
    },
  };

  return {
    ...base,
    ...overrides,
    game: {
      ...base.game,
      ...(overrides.game || {}),
      inventory: {
        ...base.game.inventory,
        ...(overrides.game?.inventory || {}),
      },
    },
  };
}

test('gacha state uses inventory shards as the source of truth', () => {
  const player = session({
    game: {
      gacha: [{ name: 'newbie', freeSpins: 0 }],
      inventory: {
        gacha: {
          name: 'Предметы гачи',
          items: [{ name: 'newbie', value: 5 }],
        },
      },
    },
  });

  const state = getGachaState(player);
  const newbie = state.spirals.find((item) => item.id === 'newbie');

  assert.equal(newbie.shards, 5);
  assert.equal(newbie.shardsCost, 5);
  assert.equal(newbie.paymentMode, 'shards');
  assert.equal(newbie.canRoll, true);
});

test('unknown gacha type is rejected without creating a pending item', () => {
  const player = session();
  const result = rollGacha(player, 'missing-spiral');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unknown_gacha');
  assert.equal(player.game.gachaTempItem, null);
});

test('pending item blocks all additional rolls until it is resolved', () => {
  const player = session({
    game: {
      gachaTempType: 'newbie',
      gachaTempItem: { name: 'test sword', grade: 'D', stats: [] },
    },
  });

  const state = getGachaState(player);
  assert.ok(state.spirals.every((spiral) => spiral.canRoll === false));

  const result = rollGacha(player, 'newbie');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'pending_item');
});

test('resolve without a pending item is rejected', () => {
  const player = session();
  const result = resolveGacha(player, 'save');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no_pending_item');
});
