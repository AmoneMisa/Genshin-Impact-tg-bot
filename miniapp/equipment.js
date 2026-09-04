import { createHash } from 'node:crypto';
import equipmentTemplate from '../template/equipmentTemplate.js';
import equipItem from '../functions/game/equipment/equipItem.js';
import unequipItem from '../functions/game/equipment/unequipItem.js';

const ACTIONS = new Set(['equip', 'unequip', 'sell']);

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function gradeMinLevel(gradeName) {
  return equipmentTemplate.grades.find((grade) => grade.name === gradeName)?.lvl?.from || 1;
}

function sameSnapshot(equipped, item) {
  if (!equipped || !item) return false;
  return equipped.name === item.name
    && equipped.grade === item.grade
    && equipped.mainType === item.mainType
    && equipped.kind === item.kind
    && asNumber(equipped.cost) === asNumber(item.cost);
}

function actuallyEquipped(session, item) {
  if (!item?.slots?.length) return false;
  const equipmentStats = session?.game?.equipmentStats || {};
  return item.slots.some((slot) => sameSnapshot(equipmentStats[slot], item));
}

function itemFingerprint(item, index) {
  const stable = JSON.stringify({
    index,
    name: item?.name || '',
    grade: item?.grade || '',
    mainType: item?.mainType || '',
    kind: item?.kind || '',
    slots: Array.isArray(item?.slots) ? item.slots : [],
    cost: asNumber(item?.cost),
    isUsed: Boolean(item?.isUsed),
  });

  return createHash('sha256').update(stable).digest('hex').slice(0, 16);
}

function itemKey(item, index) {
  return `${index}:${itemFingerprint(item, index)}`;
}

function sanitizeStats(stats) {
  if (!Array.isArray(stats)) return [];
  return stats.map((stat) => ({
    name: String(stat?.name || ''),
    value: asNumber(stat?.value),
  }));
}

function sanitizeItem(session, item, index) {
  return {
    key: itemKey(item, index),
    index,
    name: item?.name || 'Неизвестный предмет',
    translatedName: item?.translatedName || item?.kind || 'Снаряжение',
    description: item?.description || '',
    grade: item?.grade || 'noGrade',
    rarity: item?.rarity || null,
    rarityTranslated: item?.rarityTranslated || item?.rarity || null,
    mainType: item?.mainType || 'equipment',
    category: item?.category || null,
    kind: item?.kind || null,
    classOwner: Array.isArray(item?.classOwner) ? [...item.classOwner] : [],
    slots: Array.isArray(item?.slots) ? [...item.slots] : [],
    minLevel: gradeMinLevel(item?.grade),
    cost: Math.max(0, asNumber(item?.cost)),
    isUsed: actuallyEquipped(session, item),
    quality: item?.quality ? {
      current: asNumber(item.quality.current),
      max: asNumber(item.quality.max),
    } : null,
    persistence: item?.persistence ? {
      current: asNumber(item.persistence.current),
      max: asNumber(item.persistence.max),
    } : null,
    stats: sanitizeStats(item?.stats),
  };
}

function getItems(session) {
  return session?.game?.inventory?.equipment?.items || [];
}

function resolveItem(session, key) {
  if (typeof key !== 'string') return null;
  const match = key.match(/^(\d+):([a-f0-9]{16})$/);
  if (!match) return null;

  const index = Number(match[1]);
  const item = getItems(session)[index];
  if (!item) return null;
  if (itemFingerprint(item, index) !== match[2]) return null;
  return { item, index };
}

export function getEquipmentState(session) {
  const items = getItems(session);
  const sanitized = items.map((item, index) => sanitizeItem(session, item, index));
  const equippedSlots = {};

  for (const [slot, equipped] of Object.entries(session?.game?.equipmentStats || {})) {
    if (!equipped) continue;
    equippedSlots[slot] = {
      name: equipped.name || 'Снаряжение',
      translatedName: equipped.translatedName || equipped.kind || 'Снаряжение',
      grade: equipped.grade || 'noGrade',
      mainType: equipped.mainType || 'equipment',
      kind: equipped.kind || null,
    };
  }

  return {
    gold: asNumber(session?.game?.inventory?.gold),
    count: sanitized.length,
    equippedCount: sanitized.filter((item) => item.isUsed).length,
    equippedSlots,
    items: sanitized,
  };
}

export function performEquipmentAction(session, key, action) {
  if (!ACTIONS.has(action)) {
    return { ok: false, reason: 'invalid_action', equipment: getEquipmentState(session) };
  }

  const resolved = resolveItem(session, key);
  if (!resolved) {
    return { ok: false, reason: 'stale_item', equipment: getEquipmentState(session) };
  }

  const { item, index } = resolved;
  const isEquipped = actuallyEquipped(session, item);

  // Repair the stale flag left by the old text inventory before applying a new
  // mutation. Slot snapshots are the source used by combat stat calculations.
  if (Boolean(item.isUsed) !== isEquipped) item.isUsed = isEquipped;

  if (action === 'equip') {
    if (isEquipped) {
      return { ok: false, reason: 'already_equipped', equipment: getEquipmentState(session) };
    }

    const result = equipItem(session, item);
    if (result !== 0) {
      return { ok: false, reason: result === 2 ? 'invalid_item' : 'equip_failed', equipment: getEquipmentState(session) };
    }

    return { ok: true, action, item: sanitizeItem(session, item, index), equipment: getEquipmentState(session) };
  }

  if (action === 'unequip') {
    if (!isEquipped) {
      return { ok: false, reason: 'not_equipped', equipment: getEquipmentState(session) };
    }

    unequipItem(session, item);
    return { ok: true, action, item: sanitizeItem(session, item, index), equipment: getEquipmentState(session) };
  }

  if (isEquipped || item.isUsed) unequipItem(session, item);
  const soldGold = Math.max(0, asNumber(item.cost));
  session.game.inventory.gold = asNumber(session.game.inventory.gold) + soldGold;
  getItems(session).splice(index, 1);

  return {
    ok: true,
    action: 'sell',
    soldGold,
    equipment: getEquipmentState(session),
  };
}
