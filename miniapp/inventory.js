import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function arenaValue(items, key, fallback = 0) {
  const entry = (items || []).find(item => Object.prototype.hasOwnProperty.call(item || {}, key));
  return entry ? entry[key] : fallback;
}

function potionDto(item, index) {
  return {
    key: String(index),
    index,
    type: item?.type || 'hp',
    bottleType: item?.bottleType || 'potion',
    size: item?.size || '',
    count: Math.max(0, number(item?.count)),
    power: Math.max(0, number(item?.power)),
    name: item?.name || `Зелье ${index + 1}`,
    description: item?.description || '',
  };
}

export function getInventoryState(session) {
  const inventory = session?.game?.inventory || {};
  const arenaItems = inventory?.arena?.items || [];
  const potions = (inventory?.potions?.items || []).map(potionDto);
  const gameClass = session?.game?.gameClass;
  const hp = Math.max(0, number(getCurrentHp(session, gameClass)));
  const maxHp = Math.max(1, number(getMaxHp(session, gameClass), 1));
  const mp = Math.max(0, number(getCurrentMp(session, gameClass)));
  const maxMp = Math.max(1, number(getMaxMp(session, gameClass), 1));

  return {
    resources: {
      gold: Math.max(0, number(inventory.gold)),
      crystals: Math.max(0, number(inventory.crystals)),
      ironOre: Math.max(0, number(inventory.ironOre)),
    },
    player: { hp, maxHp, mp, maxMp },
    arena: {
      tokens: Math.max(0, number(arenaValue(arenaItems, 'tokens'))),
      pvpSign: arenaValue(arenaItems, 'pvpSign', null),
    },
    counts: {
      equipment: Array.isArray(inventory?.equipment?.items) ? inventory.equipment.items.length : 0,
      gacha: Array.isArray(inventory?.gacha?.items) ? inventory.gacha.items.length : 0,
      potions: potions.reduce((sum, item) => sum + item.count, 0),
    },
    potions,
  };
}

export function useInventoryPotion(session, rawKey) {
  const index = Number(rawKey);
  const items = session?.game?.inventory?.potions?.items;
  if (!Number.isInteger(index) || index < 0 || !Array.isArray(items) || !items[index]) {
    return { ok: false, reason: 'potion_not_found', inventory: getInventoryState(session) };
  }

  const potion = items[index];
  if (number(potion.count) <= 0) {
    return { ok: false, reason: 'potion_empty', inventory: getInventoryState(session) };
  }

  const gameClass = session?.game?.gameClass;
  const hp = number(getCurrentHp(session, gameClass));
  const maxHp = Math.max(1, number(getMaxHp(session, gameClass), 1));
  if (hp <= 0) {
    return { ok: false, reason: 'player_dead', inventory: getInventoryState(session) };
  }

  const multiplier = Math.max(0, number(getEquipStatByName(session, 'healPowerPotionsMul', true), 1));
  let restored = 0;
  let resource = potion.type;

  if (potion.type === 'hp') {
    if (hp >= maxHp) {
      return { ok: false, reason: 'hp_full', inventory: getInventoryState(session) };
    }
    const base = potion.bottleType === 'elixir'
      ? maxHp * number(potion.power) / 100
      : number(potion.power);
    const next = Math.min(maxHp, hp + Math.max(0, base * multiplier));
    restored = Math.max(0, Math.round(next - hp));
    session.game.gameClass.stats.hp = next;
  } else if (potion.type === 'mp') {
    const mp = number(getCurrentMp(session, gameClass));
    const maxMp = Math.max(1, number(getMaxMp(session, gameClass), 1));
    if (mp >= maxMp) {
      return { ok: false, reason: 'mp_full', inventory: getInventoryState(session) };
    }
    const next = Math.min(maxMp, mp + Math.max(0, number(potion.power) * multiplier));
    restored = Math.max(0, Math.round(next - mp));
    session.game.gameClass.stats.mp = next;
  } else {
    return { ok: false, reason: 'unsupported_potion', inventory: getInventoryState(session) };
  }

  potion.count = Math.max(0, number(potion.count) - 1);

  return {
    ok: true,
    action: 'use_potion',
    resource,
    restored,
    potion: potionDto(potion, index),
    inventory: getInventoryState(session),
  };
}
