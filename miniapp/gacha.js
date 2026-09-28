import gachaTemplate from '../template/gachaTemplate.js';
import isCanBeRolled from '../functions/game/equipment/isCanBeRolled.js';
import makeRoll from '../functions/game/equipment/makeRoll.js';
import generateRandomEquipment from '../functions/game/equipment/generateRandomEquipment.js';
import addItemToUserInventory from '../functions/game/equipment/addItemToUserInventory.js';
import breakItemToSpins from '../functions/game/equipment/breakItemToSpins.js';
import normalizeGachaState, { ensureGachaEntry, getGachaShardEntry } from '../functions/game/equipment/normalizeGachaState.js';

function paymentMode(code) {
  if (code === -2) return 'free';
  if (code === -1) return 'shards';
  if (code === 0) return 'currency';
  if (code === 1) return 'level_locked';
  if (code === 2) return 'gold_locked';
  if (code === 3) return 'crystals_locked';
  return 'locked';
}

function sanitizeItem(item) {
  if (!item) return null;
  return {
    name: item.name,
    description: item.description,
    grade: item.grade,
    rarity: item.rarity,
    rarityTranslated: item.rarityTranslated,
    mainType: item.mainType,
    category: item.category,
    kind: item.kind,
    translatedName: item.translatedName,
    classOwner: item.classOwner,
    cost: Number(item.cost) || 0,
    quality: item.quality || null,
    persistence: item.persistence || null,
    stats: Array.isArray(item.stats)
      ? item.stats.map((stat) => ({ name: stat.name, value: stat.value }))
      : [],
  };
}

export function getGachaState(session) {
  normalizeGachaState(session);

  const spirals = gachaTemplate.map((template) => {
    const state = ensureGachaEntry(session, template.name);
    const shards = getGachaShardEntry(session, template.name, true);
    const code = isCanBeRolled(session, template.name);

    return {
      id: template.name,
      title: template.translatedName,
      needLvl: template.needLvl,
      freeSpins: Number(state.freeSpins) || 0,
      shards: Number(shards.value) || 0,
      shardsCost: template.piecesForFleeCall,
      spinCost: { ...template.spinCost },
      grades: template.gradesForSpin.map((grade) => ({ ...grade })),
      canRoll: code <= 0 && !session.game.gachaTempItem,
      paymentMode: paymentMode(code),
    };
  });

  return {
    spirals,
    pending: session.game.gachaTempItem
      ? {
          gachaType: session.game.gachaTempType || null,
          item: sanitizeItem(session.game.gachaTempItem),
        }
      : null,
  };
}

export function rollGacha(session, gachaType) {
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
    state.freeSpins = Math.max(0, state.freeSpins - 1);
  } else if (code === -1) {
    shardState.value = Math.max(0, shardState.value - template.piecesForFleeCall);
  }

  const randomGrade = makeRoll(session.game, template, code < 0);
  const item = generateRandomEquipment(session.game.stats.lvl, randomGrade);
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
    addItemToUserInventory(session, item);
    session.game.gachaTempItem = null;
    session.game.gachaTempType = null;
    return {
      ok: true,
      action,
      item: sanitizeItem(item),
      gacha: getGachaState(session),
    };
  }

  if (action === 'break') {
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
