// Coins of Luck: the donation currency. They are bought with Telegram Stars (miniapp/stars.js),
// never dropped in the game, never stolen in raids, and spent in the Luck shop (template/luckShop.js).

import luckShop, { LUCK_SHOP_GROUPS } from '../template/luckShop.js';
import { addBuffPotion } from '../functions/game/player/potionBuffs.js';
import { addStarShield, starShieldAmount } from '../functions/game/builds/starShield.js';

export const ARENA_CHANCES_CAP = 15;
export const STEAL_CHANCES_CAP = 10;

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const luckCoinsOf = session => Math.max(0, number(session?.game?.inventory?.luckCoins));

export function getLuckShopState(session, now = Date.now()) {
  const coins = luckCoinsOf(session);
  const shield = starShieldAmount(session?.game, now);
  return {
    coins,
    groups: LUCK_SHOP_GROUPS,
    items: luckShop.map(item => ({
      id: item.id,
      group: item.group,
      title: item.title,
      icon: item.icon,
      cost: item.cost,
      affordable: coins >= item.cost,
      full: isFull(session, item),
    })),
    shield: shield > 0 ? { amount: shield, until: number(session.game.starShield.until) } : null,
  };
}

/** True when the item would add nothing (the counter is already at its cap). */
function isFull(session, item) {
  const game = session?.game || {};
  if (item.grant.arenaChances) return number(game.arenaChances) >= ARENA_CHANCES_CAP;
  if (item.grant.stealChances) return number(game.chanceToSteal) >= STEAL_CHANCES_CAP;
  return false;
}

function applyGrant(session, grant, now) {
  const game = session.game;
  const inventory = game.inventory;
  if (grant.crystals) {
    inventory.crystals = Math.max(0, number(inventory.crystals)) + grant.crystals;
    addStarShield(game, grant.crystals, now);
  }
  if (grant.bonusChances) game.bonusChances = Math.max(0, number(game.bonusChances)) + grant.bonusChances;
  if (grant.arenaChances) game.arenaChances = Math.min(ARENA_CHANCES_CAP, Math.max(0, number(game.arenaChances)) + grant.arenaChances);
  if (grant.stealChances) game.chanceToSteal = Math.min(STEAL_CHANCES_CAP, Math.max(0, number(game.chanceToSteal)) + grant.stealChances);
  if (grant.chestTry) {
    // Same as the gold shop's extra chest round: start a fresh round of three.
    session.chestCounter = 0;
    session.chosenChests = [];
    session.chestButtons = [];
    session.chestTries = Math.max(0, number(session.chestTries)) + grant.chestTry;
  }
  if (grant.potion) return addBuffPotion(session, grant.potion) !== null;
  return true;
}

/** Spends coins on one shop item. The caller saves the session. */
export function buyLuckItem(session, itemId, now = Date.now()) {
  const item = luckShop.find(entry => entry.id === itemId);
  if (!item) return { ok: false, reason: 'unknown_item' };
  const inventory = session?.game?.inventory;
  if (!inventory) return { ok: false, reason: 'inventory_missing' };
  if (luckCoinsOf(session) < item.cost) return { ok: false, reason: 'not_enough_coins', missing: item.cost - luckCoinsOf(session) };
  if (isFull(session, item)) return { ok: false, reason: 'already_full' };

  // Deliver first: a grant that cannot be delivered costs nothing.
  if (!applyGrant(session, item.grant, now)) return { ok: false, reason: 'delivery_failed' };
  inventory.luckCoins = luckCoinsOf(session) - item.cost;
  return { ok: true, item: { id: item.id, title: item.title }, spent: item.cost };
}
