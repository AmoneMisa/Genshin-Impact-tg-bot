import {getMaterialCount, listMaterials, spendMaterials} from '../functions/game/player/materials.js';
import {l2SellPrice} from '../functions/game/hunt/lootTable.js';
import {HUNT} from '../functions/game/hunt/huntConfig.js';
import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getCurrentCp from '../functions/game/player/getters/getCurrentCp.js';
import getMaxCp from '../functions/game/player/getters/getMaxCp.js';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';
import potionRestore, { potionShare } from '../functions/game/player/potionRestore.js';
import buffPotions from '../template/buffPotions.js';
import {applyPotionBuff,activePotionBuffs} from '../functions/game/player/potionBuffs.js';

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
    // Share of the maximum a flat potion restores at the least (0 for elixirs, which are percentages).
    share: Math.round(potionShare(item) * 100),
    name: item?.name || `Зелье ${index + 1}`,
    description: item?.description || '',
    id:item?.id || null,
    seconds:item?.seconds || null,
    grade:item?.grade || null,
    needLvl:Math.max(0, number(item?.needLvl)),
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
    materials:listMaterials(session).map(item=>({key:item.key,name:item.name,icon:item.icon,count:item.count,kind:item.kind||null,sellPrice:l2SellPrice(item.key,HUNT.goldScale)})),
    potions,
    buffs:activePotionBuffs(session).map(e=>({id:e.potionId,name:e.name,until:e.until})),
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
  if (number(potion.needLvl) > number(session?.game?.stats?.lvl, 1)) {
    return { ok: false, reason: 'level_too_low', needLvl: potion.needLvl, inventory: getInventoryState(session) };
  }

  const multiplier = Math.max(0, number(getEquipStatByName(session, 'healPowerPotionsMul', true), 1));
  let restored = 0;
  let resource = potion.type;

  if (potion.type === 'buff') {
    const definition=buffPotions.find(p=>p.id===potion.id);
    if(!definition)return {ok:false,reason:'unsupported_potion',inventory:getInventoryState(session)};
    const effect=applyPotionBuff(session,definition.id);
    potion.count=Math.max(0,number(potion.count)-1);
    return {ok:true,action:'use_potion',resource:'buff',effect,potion:potionDto(potion,index),inventory:getInventoryState(session)};
  } else if (potion.type === 'hp') {
    if (hp >= maxHp) {
      return { ok: false, reason: 'hp_full', inventory: getInventoryState(session) };
    }
    const base = potionRestore(potion, maxHp);
    const next = Math.min(maxHp, hp + Math.max(0, base * multiplier));
    restored = Math.max(0, Math.round(next - hp));
    session.game.gameClass.stats.hp = next;
  } else if (potion.type === 'cp') {
    const cp = number(getCurrentCp(session, gameClass));
    const maxCp = Math.max(1, number(getMaxCp(session, gameClass), 1));
    if (cp >= maxCp) {
      return { ok: false, reason: 'cp_full', inventory: getInventoryState(session) };
    }
    const next = Math.min(maxCp, cp + Math.max(0, potionRestore(potion, maxCp) * multiplier));
    restored = Math.max(0, Math.round(next - cp));
    session.game.gameClass.stats.cp = next;
  } else if (potion.type === 'mp') {
    const mp = number(getCurrentMp(session, gameClass));
    const maxMp = Math.max(1, number(getMaxMp(session, gameClass), 1));
    if (mp >= maxMp) {
      return { ok: false, reason: 'mp_full', inventory: getInventoryState(session) };
    }
    const next = Math.min(maxMp, mp + Math.max(0, potionRestore(potion, maxMp) * multiplier));
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

/** Sells collectable High Five items (pieces, recipes, full items, herbs ...) to the shop for half their real price. */
export function sellLoot(session, rawKey, rawCount = null) {
  const key = String(rawKey || '');
  const price = l2SellPrice(key, HUNT.goldScale);
  if (!price) return { ok: false, reason: 'not_sellable', inventory: getInventoryState(session) };
  const owned = getMaterialCount(session, key);
  const count = rawCount === null || rawCount === undefined || rawCount === 'all' ? owned : Math.floor(number(rawCount));
  if (!Number.isSafeInteger(count) || count < 1 || count > owned) return { ok: false, reason: 'invalid_count', inventory: getInventoryState(session) };
  spendMaterials(session, { [key]: count });
  const gold = price * count;
  session.game.inventory.gold = number(session.game.inventory.gold) + gold;
  return { ok: true, action: 'sell', key, count, gold, inventory: getInventoryState(session) };
}
