// Coins of Luck: the donation currency, bought with Telegram Stars (miniapp/stars.js). They are
// never raided. Fighters of epic raid bosses and the top of the weekly arena also earn a few.
// Spent in the Donate shop (template/luckShop.js) plus rented epic equipment built here.

import luckShop, { LUCK_SHOP_GROUPS, TIMED_EPIC_PRICE } from '../template/luckShop.js';
import { addPotionById } from '../functions/game/player/potionBuffs.js';
import elixirs from '../template/elixirs.js';
import buffPotions from '../template/buffPotions.js';
import { addMaterial } from '../functions/game/player/materials.js';
import { addStarShield, starShieldAmount } from '../functions/game/builds/starShield.js';
import { canClassUse, getCatalog, gradeInfo } from '../functions/game/equipment/catalog.js';
import { TIMED_EPIC_DAYS, daysLeft, expireTimedItems, grantTimedItem, isTimedItem } from '../functions/game/equipment/timedItems.js';

export const ARENA_CHANCES_CAP = 15;
export const STEAL_CHANCES_CAP = 10;
export const TIMED_PREFIX = 'timed:';

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const luckCoinsOf = session => Math.max(0, number(session?.game?.inventory?.luckCoins));

const className = session => session?.game?.gameClass?.stats?.name || 'noClass';
const level = session => Math.max(1, number(session?.game?.stats?.lvl, 1));

/** Epic weapons and jewellery the player's class can wear, as shop offers for TIMED_EPIC_DAYS days. */
function epicOffers(session, now) {
  const owned = new Map((session?.game?.inventory?.equipment?.items || []).filter(isTimedItem).map(item => [item.id, item]));
  return getCatalog()
    .filter(item => item.epic && canClassUse(className(session), item))
    .sort((a, b) => (a.mainType === 'weapon' ? 0 : 1) - (b.mainType === 'weapon' ? 0 : 1) || a.name.localeCompare(b.name, 'ru'))
    .map(item => {
      const needLvl = gradeInfo(item.grade)?.lvl?.from ?? 1;
      const own = owned.get(item.id);
      return {
        id: `${TIMED_PREFIX}${item.id}`,
        group: 'epic',
        title: item.name,
        icon: item.mainType === 'weapon' ? '⚔️' : '💍',
        subtitle: `${TIMED_EPIC_DAYS} дней · LVL ${needLvl}+${own ? ` · у тебя ещё ${daysLeft(own, now)} дн.` : ''}`,
        cost: item.mainType === 'weapon' ? TIMED_EPIC_PRICE.weapon : TIMED_EPIC_PRICE.jewelry,
        needLvl,
        epicWeapon: item.epicWeapon || null,
        catalogId: item.id,
      };
    });
}

function shopItems(session, now) {
  return [...epicOffers(session, now), ...luckShop];
}

export function getLuckShopState(session, now = Date.now()) {
  expireTimedItems(session, now);
  const coins = luckCoinsOf(session);
  const shield = starShieldAmount(session?.game, now);
  const items = shopItems(session, now).map(item => ({
    id: item.id,
    group: item.group,
    title: item.title,
    icon: item.icon,
    artMaterial: Object.keys(item.grant?.materials || {})[0] || null,
    artPotion: item.grant?.potion ? [...elixirs,...buffPotions].find(p=>p.id===item.grant.potion.id) || null : null,
    artItem: item.id?.startsWith(TIMED_PREFIX) ? getCatalog().find(entry=>entry.id===item.id.slice(TIMED_PREFIX.length)) : null,
    subtitle: item.subtitle || '',
    cost: item.cost,
    affordable: coins >= item.cost,
    full: isFull(session, item),
    locked: item.needLvl ? level(session) < item.needLvl : false,
    needLvl: item.needLvl || 0,
  }));
  return {
    coins,
    groups: LUCK_SHOP_GROUPS.map(group => ({ ...group, count: items.filter(item => item.group === group.id).length })).filter(group => group.count > 0),
    items,
    shield: shield > 0 ? { amount: shield, until: number(session.game.starShield.until) } : null,
  };
}

/** True when the item would add nothing (the counter is already at its cap). */
function isFull(session, item) {
  const game = session?.game || {};
  const grant = item.grant || {};
  if (grant.arenaChances) return number(game.arenaChances) >= ARENA_CHANCES_CAP;
  if (grant.stealChances) return number(game.chanceToSteal) >= STEAL_CHANCES_CAP;
  return false;
}

function applyGrant(session, grant, now) {
  const game = session.game;
  const inventory = game.inventory;
  if (grant.crystals) {
    inventory.crystals = Math.max(0, number(inventory.crystals)) + grant.crystals;
    addStarShield(game, grant.crystals, now);
  }
  if (grant.ironOre) inventory.ironOre = Math.max(0, number(inventory.ironOre)) + grant.ironOre;
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
  for (const [key, count] of Object.entries(grant.materials || {})) addMaterial(session, key, count);
  if (grant.potion) return addPotionById(session, grant.potion.id, grant.potion.count || 1) !== null;
  return true;
}

/** Spends coins on one shop item. The caller saves the session. */
export function buyLuckItem(session, itemId, now = Date.now()) {
  expireTimedItems(session, now);
  const item = shopItems(session, now).find(entry => entry.id === itemId);
  if (!item) return { ok: false, reason: 'unknown_item' };
  const inventory = session?.game?.inventory;
  if (!inventory) return { ok: false, reason: 'inventory_missing' };
  if (luckCoinsOf(session) < item.cost) return { ok: false, reason: 'not_enough_coins', missing: item.cost - luckCoinsOf(session) };
  if (isFull(session, item)) return { ok: false, reason: 'already_full' };

  let extended = false;
  if (item.catalogId) {
    // Rented epic equipment: a level below the grade is a heavy penalty, so it is not sold.
    if (level(session) < item.needLvl) return { ok: false, reason: 'level_too_low', needLvl: item.needLvl };
    const rented = grantTimedItem(session, item.catalogId, TIMED_EPIC_DAYS, now);
    if (!rented) return { ok: false, reason: 'delivery_failed' };
    extended = rented.extended;
  } else if (!applyGrant(session, item.grant, now)) {
    // Deliver first: a grant that cannot be delivered costs nothing.
    return { ok: false, reason: 'delivery_failed' };
  }
  inventory.luckCoins = luckCoinsOf(session) - item.cost;
  return { ok: true, item: { id: item.id, title: item.title }, spent: item.cost, extended };
}
