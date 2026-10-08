import test from 'node:test';
import assert from 'node:assert/strict';
import luckShop, { LUCK_SHOP_GROUPS } from '../template/luckShop.js';
import buffPotions from '../template/buffPotions.js';
import { ARENA_CHANCES_CAP, STEAL_CHANCES_CAP, buyLuckItem, getLuckShopState, luckCoinsOf } from '../miniapp/luck.js';
import { starShieldAmount } from '../functions/game/builds/starShield.js';
import { createMiniAppState } from '../miniapp/state.js';
import { applyReward } from '../miniapp/promo.js';
import { stealableCrystals } from '../functions/game/builds/stealResources.js';

const NOW = Date.UTC(2026, 9, 8, 12);
const item = id => luckShop.find(entry => entry.id === id);

function player(coins = 100, extra = {}) {
  return {
    chestTries: 0, chestCounter: 2, chosenChests: ['a'], chestButtons: ['b'],
    game: { inventory: { gold: 0, crystals: 5, ironOre: 0, luckCoins: coins, potions: { items: [] } }, bonusChances: 1, arenaChances: 10, chanceToSteal: 2, ...extra },
  };
}

test('every shop item is well formed and belongs to a group', () => {
  const groups = new Set(LUCK_SHOP_GROUPS.map(group => group.id));
  const ids = new Set();
  for (const entry of luckShop) {
    assert.ok(groups.has(entry.group), entry.id);
    assert.ok(Number.isInteger(entry.cost) && entry.cost > 0, entry.id);
    assert.equal(ids.has(entry.id), false, `duplicate ${entry.id}`);
    ids.add(entry.id);
  }
  for (const potion of buffPotions) assert.ok(item(`potion-${potion.id}`), potion.id);
});

test('crystals are bought with coins and shielded from raids like the old paid crystals', () => {
  const s = player(100);
  const result = buyLuckItem(s, 'crystals-500', NOW);
  assert.equal(result.ok, true);
  assert.equal(s.game.inventory.luckCoins, 55);
  assert.equal(s.game.inventory.crystals, 505);
  assert.equal(starShieldAmount(s.game, NOW), 500);
  assert.equal(stealableCrystals(505, 0, s.game, NOW), 5, 'only the unshielded rest can be raided');
});

test('a buff potion lands in the inventory and stacks', () => {
  const s = player(30);
  assert.equal(buyLuckItem(s, 'potion-might', NOW).ok, true);
  assert.equal(buyLuckItem(s, 'potion-might', NOW).ok, true);
  const stack = s.game.inventory.potions.items.find(entry => entry.id === 'might');
  assert.equal(stack.count, 2);
  assert.equal(s.game.inventory.luckCoins, 30 - 12);
});

test('tries: chests start a fresh round, arena and steal stop at their caps', () => {
  const s = player(200);
  buyLuckItem(s, 'chest-try', NOW);
  assert.deepEqual([s.chestTries, s.chestCounter, s.chosenChests, s.chestButtons], [1, 0, [], []]);
  buyLuckItem(s, 'bonus-chance', NOW);
  assert.equal(s.game.bonusChances, 2);

  buyLuckItem(s, 'arena-chances', NOW);
  assert.equal(s.game.arenaChances, 13);
  buyLuckItem(s, 'arena-chances', NOW);
  assert.equal(s.game.arenaChances, ARENA_CHANCES_CAP);
  const spent = s.game.inventory.luckCoins;
  assert.equal(buyLuckItem(s, 'arena-chances', NOW).reason, 'already_full');
  assert.equal(s.game.inventory.luckCoins, spent, 'nothing is charged for a full counter');

  s.game.chanceToSteal = STEAL_CHANCES_CAP;
  assert.equal(buyLuckItem(s, 'steal-chances', NOW).reason, 'already_full');
});

test('purchases are refused without coins, for unknown items, and never charge on failure', () => {
  const s = player(5);
  assert.equal(buyLuckItem(s, 'crystals-100', NOW).reason, 'not_enough_coins');
  assert.equal(buyLuckItem(s, 'nope', NOW).reason, 'unknown_item');
  assert.equal(s.game.inventory.luckCoins, 5);
  assert.equal(s.game.inventory.crystals, 5);
  assert.equal(luckCoinsOf({ game: { inventory: {} } }), 0);
  assert.equal(luckCoinsOf({ game: { inventory: { luckCoins: -4 } } }), 0);
});

test('the state lists items with affordability and the player state carries the balance', () => {
  const s = player(10);
  const state = getLuckShopState(s, NOW);
  assert.equal(state.coins, 10);
  assert.equal(state.items.find(entry => entry.id === 'crystals-100').affordable, true);
  assert.equal(state.items.find(entry => entry.id === 'crystals-500').affordable, false);
  const mini = createMiniAppState({ game: s.game }, { chatId: 1, user: { id: 1 } });
  assert.equal(mini.player.luckCoins, 10);
});

test('promo and mail rewards can pay Coins of Luck', () => {
  const s = player(0);
  applyReward(s, { kind: 'luckCoins', amount: 25 });
  assert.equal(s.game.inventory.luckCoins, 25);
});
