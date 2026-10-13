import {GACHA_REWARDS,generateGachaReward,grantGachaReward,shadowGachaItem} from '../functions/game/equipment/gachaRewards.js';
import {hasInventoryRoom} from '../functions/game/builds/palaceCapacity.js';
import {getMaterialCount} from '../functions/game/player/materials.js';
import {spendMaterials} from '../functions/game/player/materials.js';
import {materialInfo} from '../functions/game/player/materials.js';
import {dailyGacha,DAILY_GACHA_SPINS} from '../functions/game/equipment/gachaDaily.js';
import {migrateSessionEquipment} from '../functions/game/equipment/migrateEquipment.js';
import gachaTemplate from '../template/gachaTemplate.js';
import isCanBeRolled from '../functions/game/equipment/isCanBeRolled.js';
import makeRoll from '../functions/game/equipment/makeRoll.js';
import breakItemToSpins from '../functions/game/equipment/breakItemToSpins.js';
import { describeItemStats } from '../functions/game/equipment/describeStats.js';
import normalizeGachaState, { ensureGachaEntry, getGachaShardEntry } from '../functions/game/equipment/normalizeGachaState.js';

function paymentMode(code) {
  if (code === -2) return 'free';
  if (code === -1) return 'shards';
  if (code === 0) return 'currency';
  if (code === 1) return 'level_locked';
  if (code === 2) return 'gold_locked';
  if (code === 3) return 'dew_locked';
  if (code === 4) return 'resources_locked';
  return 'locked';
}

function sanitizeItem(item) {
  if (!item) return null;
  const ref=({scroll_escape:'l2_736',scroll_resurrection:'l2_737',ironOre:'l2_1869'})[item.rewardRef]||item.rewardRef;
  const displayName=({l2_736:'Свиток возвращения',l2_737:'Свиток воскрешения',l2_1869:'Железная руда',l2_1867:'Замша',l2_1865:'Варниш',sp:'SP',moonDew:'Лунная роса'})[ref]||materialInfo(ref).name;
  return {
    rewardLabel:GACHA_REWARDS.find(r=>r.kind===item.rewardKind)?.label,rewardKind:item.rewardKind,rewardRef:ref,amount:item.amount,shadow:item.shadow,enchant:item.enchant,expiresAt:item.expiresAt,
    name: item.name,
    description: item.description,
    grade: item.grade,
    rarity: item.rarity,
    rarityTranslated: item.rarityTranslated,
    mainType: item.mainType,
    category: item.category,
    kind: item.kind,
    translatedName: item.rewardKind?displayName:item.translatedName,
    classOwner: item.classOwner,
    cost: Number(item.cost) || 0,
    quality: null,
    persistence: null,
    ability: item.ability || null,
    lineage: item.lineage || null,
    set: item.setId ? { id: item.setId, name: item.setName || null } : null,
    stats: describeItemStats(item),
  };
}

export function getGachaState(session) {
  normalizeGachaState(session);
  migrateSessionEquipment(session);
  if(session.game.gachaTempItem&&!session.game.gachaTempItem.rewardKind&&!session.game.gachaTempItem.shadow)session.game.gachaTempItem=shadowGachaItem(session.game.gachaTempItem);

  const spirals = gachaTemplate.map((template) => {
    const state = ensureGachaEntry(session, template.name);
    const shards = getGachaShardEntry(session, template.name, true);
    const code = isCanBeRolled(session, template.name);

    return {
      id: template.name,
      title: template.translatedName,
      needLvl: template.needLvl,
      freeSpins: dailyGacha(session).remaining,
      shards: Number(shards.value) || 0,
      shardsCost: template.piecesForFleeCall,
      spinCost: { ...template.spinCost },
      materialCost: {...template.materialCost},
      rewards:(template.rewards||GACHA_REWARDS).map(r=>({...r})),
      grades: template.gradesForSpin.map((grade) => ({ ...grade })),
      canRoll: code <= 0 && !session.game.gachaTempItem,
      paymentMode: paymentMode(code),
    };
  });

  return {
    dailyLimit:DAILY_GACHA_SPINS,freeSpins:dailyGacha(session).remaining,
    spirals,
    pending: session.game.gachaTempItem
      ? {
          gachaType: session.game.gachaTempType || null,
          item: sanitizeItem(session.game.gachaTempItem),
        }
      : null,
  };
}

export function rollGacha(session, gachaType, options={}) {
  const template = gachaTemplate.find((item) => item.name === gachaType);
  if (!template) {
    return { ok: false, reason: 'unknown_gacha', gacha: getGachaState(session) };
  }

  if (session.game.gachaTempItem) {
    return { ok: false, reason: 'pending_item', gacha: getGachaState(session) };
  }

  const state = ensureGachaEntry(session, gachaType);
  const shardState = getGachaShardEntry(session, gachaType, true);
  const code = isCanBeRolled(session, gachaType);

  if (code > 0) {
    return { ok: false, reason: paymentMode(code), gacha: getGachaState(session) };
  }

  if (code === -2) {
    dailyGacha(session).remaining--;
  } else if (code === -1) {
    shardState.value = Math.max(0, shardState.value - template.piecesForFleeCall);
  }

  if(code===0)spendMaterials(session,template.materialCost||{});
  const randomGrade = makeRoll(session.game, template, code < 0);
  // The spiral's own grade odds decide the grade; the generator adds no extra upgrade roll.
  const item = generateGachaReward(session,randomGrade,{...options,rewards:template.rewards});
  session.game.gachaTempItem = item;
  session.game.gachaTempType = gachaType;

  return {
    ok: true,
    paymentMode: paymentMode(code),
    item: sanitizeItem(item),
    gacha: getGachaState(session),
  };
}

export function resolveGacha(session, action) {
  const item = session.game.gachaTempItem;
  const gachaType = session.game.gachaTempType;
  if (!item || !gachaType) {
    return { ok: false, reason: 'no_pending_item', gacha: getGachaState(session) };
  }

  if (action === 'save') {
    const needsRoom=!item.rewardKind || ((item.rewardKind!=='resource'||item.rewardRef.startsWith('l2_')) && getMaterialCount(session,item.rewardRef)===0);
    if(needsRoom&&!hasInventoryRoom(session,1))return {ok:false,reason:'inventory_full',gacha:getGachaState(session)};
    if(item.rewardKind)grantGachaReward(session,item);else session.game.inventory.equipment.items.push(shadowGachaItem(item));
    session.game.gachaTempItem = null;
    session.game.gachaTempType = null;
    return {
      ok: true,
      action,
      item: sanitizeItem(item),
      gacha: getGachaState(session),
    };
  }

  if (action === 'break' && !item.rewardKind) {
    const shards = breakItemToSpins(session.game.inventory, item, gachaType);
    session.game.gachaTempItem = null;
    session.game.gachaTempType = null;
    return {
      ok: true,
      action,
      shards,
      gachaType,
      gacha: getGachaState(session),
    };
  }

  return { ok: false, reason: 'invalid_action', gacha: getGachaState(session) };
}
