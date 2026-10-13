import {useRecoveryScroll} from '../functions/game/player/deathPenalties.js';
import {getMaterialCount, listMaterials, spendMaterials, materialInfo} from '../functions/game/player/materials.js';
import {l2SellPrice} from '../functions/game/hunt/lootTable.js';
import {HUNT} from '../functions/game/hunt/huntConfig.js';
import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getCurrentCp from '../functions/game/player/getters/getCurrentCp.js';
import getMaxCp from '../functions/game/player/getters/getMaxCp.js';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';
import potionsTemplate from '../template/potionsInInventoryTemplate.js';
import potionRestore, { potionShare } from '../functions/game/player/potionRestore.js';
import {queuePotionHealing,HP_POTION_SECONDS} from '../functions/game/player/potionHealing.js';
import buffPotions from '../template/buffPotions.js';
import {applyPotionBuff,activePotionBuffs} from '../functions/game/player/potionBuffs.js';
import {getEquipmentState,performEquipmentAction} from './equipment.js';
import {hennaOfDye} from '../functions/game/player/tattoos.js';
import {inventoryUsage} from '../functions/game/builds/palaceCapacity.js';

const potionRef = item => item?.id || `${item?.type}:${item?.bottleType}:${item?.power}:${item?.size}`;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function arenaValue(items, key, fallback = 0) {
  const entry = (items || []).find(item => Object.prototype.hasOwnProperty.call(item || {}, key));
  return entry ? entry[key] : fallback;
}

/** Potions are named in English only: a stored potion with a Russian name takes the name of its template. */
function templateName(item) {
  if (!/[А-Яа-яЁё]/.test(String(item?.name || ''))) return null;
  const same = potionsTemplate.find(row => (item.id && row.id === item.id) ||
    (!item.id && !row.id && row.type === item.type && row.bottleType === item.bottleType && Number(row.power) === Number(item.power)));
  return same?.name || null;
}

function potionDto(item, index) {
  return {
    key: String(index),
    ref: potionRef(item),
    index,
    type: item?.type || 'hp',
    bottleType: item?.bottleType || 'potion',
    size: item?.size || '',
    count: Math.max(0, number(item?.count)),
    power: Math.max(0, number(item?.power)),
    // Share of the maximum a flat potion restores at the least (0 for elixirs, which are percentages).
    share: Math.round(potionShare(item) * 100),
    name: templateName(item) || item?.name || `Potion ${index + 1}`,
    description: item?.type === 'hp' ? `Восстанавливает ${item.power}${item.bottleType === 'elixir' ? '%' : ''} HP тиками в течение 15 секунд.`
      : item?.type === 'mp' ? `Мгновенно восстанавливает ${item.power}${item.bottleType === 'elixir' ? '%' : ''} MP.`
        : buffPotions.find(p=>p.id === item?.id)?.description || item?.description || '',
    id:item?.id || null,
    artKey:item?.artKey || null,
    seconds:item?.seconds || null,
    grade:item?.grade || null,
    needLvl:Math.max(0, number(item?.needLvl)),
  };
}

export function getInventoryState(session) {
  const inventory = session?.game?.inventory || {};
  const equipmentState = getEquipmentState(session);
  const equipment = equipmentState.items;
  const arenaItems = inventory?.arena?.items || [];
  const potions = (inventory?.potions?.items || []).map(potionDto).filter(item=>item.count>0);
  const gameClass = session?.game?.gameClass;
  const hp = Math.max(0, number(getCurrentHp(session, gameClass)));
  const maxHp = Math.max(1, number(getMaxHp(session, gameClass), 1));
  const mp = Math.max(0, number(getCurrentMp(session, gameClass)));
  const maxMp = Math.max(1, number(getMaxMp(session, gameClass), 1));
  const cp = Math.max(0, number(getCurrentCp(session, gameClass)));
  const maxCp = Math.max(1, number(getMaxCp(session, gameClass), 1));

  return {
    resources: {
      gold: Math.max(0, number(inventory.gold)),
      ironOre: Math.max(0, number(inventory.ironOre)),
      luckCoins: Math.max(0, number(inventory.luckCoins)),
    },
    slots: inventoryUsage(session),
    player: { cp, maxCp, hp, maxHp, mp, maxMp, className:session?.game?.gameClass?.stats?.name || 'warrior', gender:session?.gender || 'male' },
    equippedSlots:equipmentState.equippedSlots,
    tattoos:(Array.isArray(session?.game?.tattoos)?session.game.tattoos:[]).map(entry=>({dye:entry.dye,name:hennaOfDye(entry.dye)?.name || String(entry.dye)})),
    arena: {
      tokens: Math.max(0, number(arenaValue(arenaItems, 'tokens'))),
      pvpSign: arenaValue(arenaItems, 'pvpSign', null),
    },
    counts: {
      equipment: Array.isArray(inventory?.equipment?.items) ? inventory.equipment.items.length : 0,
      gacha: Array.isArray(inventory?.gacha?.items) ? inventory.gacha.items.length : 0,
      potions: potions.reduce((sum, item) => sum + item.count, 0),
    },
    materials:listMaterials(session).map(item=>({key:item.key,id:item.id||null,name:item.name,description:item.description||'',icon:item.icon,count:item.count,kind:item.kind||null,bound:Boolean(item.bound),usable:Boolean(item.usable),sellPrice:item.bound?0:l2SellPrice(item.key,HUNT.goldScale)})),
    potions,
    equipment,
    buffs:activePotionBuffs(session).map(e=>({id:e.potionId,name:e.name,until:e.until})),
  };
}

/** Discard owned items only; no gold or building resources are awarded or spent. */
export function discardInventoryItem(session, {kind,ref,count=1} = {}) {
  const fail = reason => ({ok:false,reason,inventory:getInventoryState(session)});
  const amount=Number(count);
  if(!Number.isSafeInteger(amount)||amount<1)return fail('invalid_count');
  if(kind==='equipment'){
    if(amount!==1)return fail('invalid_count');
    const result=performEquipmentAction(session,ref,'discard');
    return {...result,inventory:getInventoryState(session)};
  }
  if(kind==='material'){
    if(typeof ref!=='string'||!listMaterials(session).some(row=>row.key===ref))return fail('item_not_found');
    if(amount>getMaterialCount(session,ref))return fail('invalid_count');
    spendMaterials(session,{[ref]:amount});
  }else if(kind==='potion'){
    const item=session?.game?.inventory?.potions?.items?.find(row=>potionRef(row)===ref&&number(row.count)>0);
    if(!item)return fail('item_not_found');
    if(amount>number(item.count))return fail('invalid_count');
    item.count-=amount;
  }else return fail('invalid_kind');
  return {ok:true,action:'discard',count:amount,inventory:getInventoryState(session)};
}

export function useInventoryPotion(session, rawKey) {
  if(/^l2_859[4-9]$/.test(String(rawKey))){const result=useRecoveryScroll(session,String(rawKey));return {...result,inventory:getInventoryState(session)};}
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
  let healing = 0;
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
    healing = Math.max(0, base * multiplier);
    queuePotionHealing(session,healing);
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
    healing, durationSeconds:healing ? HP_POTION_SECONDS : 0,
    potion: potionDto(potion, index),
    inventory: getInventoryState(session),
  };
}

/** Sells collectable High Five items (pieces, recipes, full items, herbs ...) to the shop for half their real price. */
export function sellLoot(session, rawKey, rawCount = null) {
  const key = String(rawKey || '');
  if(materialInfo(key).bound)return {ok:false,reason:'not_sellable',inventory:getInventoryState(session)};
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
