import test from 'node:test';
import assert from 'node:assert/strict';
import { getShopState, buyShopItem } from '../miniapp/shop.js';

function session({ gold = 0, shopTimers = {} } = {}) {
  return {
    game: {
      inventory: { gold },
      shopTimers,
    },
  };
}

test('shop state exposes categories and affordability without mutating player', () => {
  const player = session({ gold: 2000 });
  const state = getShopState(player, 1000);

  assert.equal(state.gold, 2000);
  assert.ok(state.categories.some(category => category.id === 'boss'));
  assert.ok(state.items.length > 0);

  const cheap = state.items.find(item => item.cost <= 2000);
  const expensive = state.items.find(item => item.cost > 2000);
  assert.equal(cheap?.canAfford, true);
  assert.equal(expensive?.canAfford, false);
  assert.equal(player.game.inventory.gold, 2000);
});

test('shop state respects persisted cooldown timestamps', () => {
  const now = 10_000;
  const player = session({
    gold: 100_000,
    shopTimers: { bossAddDmg: now + 60_000 },
  });

  const item = getShopState(player, now).items.find(candidate => candidate.command === 'bossAddDmg');
  assert.equal(item.onCooldown, true);
  assert.equal(item.available, false);
  assert.equal(item.resetAt, now + 60_000);
});

test('shop rejects unknown items and insufficient gold before mutation', async () => {
  const player = session({ gold: 10 });

  const unknown = await buyShopItem(player, 'does-not-exist', 1000);
  assert.equal(unknown.ok, false);
  assert.equal(unknown.reason, 'unknown_item');

  const poor = await buyShopItem(player, 'bossAddDmg', 1000);
  assert.equal(poor.ok, false);
  assert.equal(poor.reason, 'not_enough_gold');
  assert.equal(player.game.inventory.gold, 10);
});
