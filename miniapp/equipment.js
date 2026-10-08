import { createHash } from 'node:crypto';
import equipmentTemplate from '../template/equipmentTemplate.js';
import equipItem from '../functions/game/equipment/equipItem.js';
import unequipItem from '../functions/game/equipment/unequipItem.js';
import craftItem, {
  craftNeedExp,
  ensureCraft,
  isRecipeLearned,
  learnRecipe,
  missingForRecipe,
  recipeMaterialRows,
  visibleRecipes,
} from '../functions/game/equipment/craftItem.js';
import { findCatalogItem } from '../functions/game/equipment/catalog.js';
import {
  blessedKey,
  buyScroll,
  crystalKey,
  crystalYield,
  crystallizeItem,
  enchantChance,
  enchantItem,
  isEnchantable,
  scrollKey,
  scrollPrice,
} from '../functions/game/equipment/enchantItem.js';
import { activeSets, getEnchantLevel, maxEnchantLevel, safeEnchantLevel } from '../functions/game/equipment/itemBonuses.js';
import { describeItemStats } from '../functions/game/equipment/describeStats.js';
import { canClassUse } from '../functions/game/equipment/catalog.js';
import { isActuallyEquipped } from '../functions/game/equipment/snapshots.js';
import { getMaterialCount } from '../functions/game/player/materials.js';

const ACTIONS = new Set(['equip', 'unequip', 'sell', 'enchant', 'crystallize']);

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getResources(session) {
  const inventory = session?.game?.inventory || {};
  return {
    gold: Math.max(0, asNumber(inventory.gold)),
    crystals: Math.max(0, asNumber(inventory.crystals)),
    ironOre: Math.max(0, asNumber(inventory.ironOre)),
  };
}

function missingResources(resources, cost) {
  return {
    gold: Math.max(0, asNumber(cost?.gold) - resources.gold),
    crystals: Math.max(0, asNumber(cost?.crystals) - resources.crystals),
    ironOre: Math.max(0, asNumber(cost?.ironOre) - resources.ironOre),
  };
}

function gradeMinLevel(gradeName) {
  return equipmentTemplate.grades.find((grade) => grade.name === gradeName)?.lvl?.from || 1;
}

function itemFingerprint(item, index) {
  const stable = JSON.stringify({
    index,
    uid: item?.uid || '',
    name: item?.name || '',
    grade: item?.grade || '',
    mainType: item?.mainType || '',
    kind: item?.kind || '',
    slots: Array.isArray(item?.slots) ? item.slots : [],
    cost: asNumber(item?.cost),
    isUsed: Boolean(item?.isUsed),
    enchant: getEnchantLevel(item),
  });

  return createHash('sha256').update(stable).digest('hex').slice(0, 16);
}

function itemKey(item, index) {
  return `${index}:${itemFingerprint(item, index)}`;
}

function playerClassName(session) {
  return session?.game?.gameClass?.stats?.name || null;
}

function sanitizeItem(session, item, index) {
  const enchant = getEnchantLevel(item);
  const enchantable = isEnchantable(item);
  const maxed = enchant >= maxEnchantLevel();
  const level = asNumber(session?.game?.stats?.lvl, 1);
  const minLevel = gradeMinLevel(item?.grade);

  return {
    key: itemKey(item, index),
    index,
    uid: item?.uid || null,
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
    canUse: canClassUse(playerClassName(session), item),
    slots: Array.isArray(item?.slots) ? [...item.slots] : [],
    minLevel,
    levelPenalty: level < minLevel,
    cost: Math.max(0, asNumber(item?.cost)),
    isUsed: isActuallyEquipped(session, item),
    // Items no longer have random quality / durability; the fields stay so older clients render.
    quality: null,
    persistence: null,
    stats: describeItemStats(item),
    ability: item?.ability || null,
    epic: Boolean(item?.epic),
    epicBoss: item?.epicBoss || null,
    epicWeapon:item?.epicWeapon || null,
    collection:item?.collection || null,
    // the real Lineage 2 numbers of the item (P.Atk / M.Atk / P.Def / M.Def)
    lineage: item?.lineage || null,
    set: item?.setId ? { id: item.setId, name: item.setName || null } : null,
    enchant,
    // The forge milestone art reads the enchant level under its old name.
    forgeLevel: enchant,
    maxForgeLevel: maxEnchantLevel(),
    maxEnchant: maxEnchantLevel(),
    safeEnchant: safeEnchantLevel(item),
    enchantable,
    canEnchant: enchantable && !maxed,
    enchantChance: enchantable && !maxed ? enchantChance(item) : null,
    scrolls: enchantable ? {
      plain: getMaterialCount(session, scrollKey(item.grade)),
      blessed: getMaterialCount(session, blessedKey(item.grade)),
    } : null,
    crystals: enchantable ? crystalYield(item) : 0,
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

function getSetsState(session) {
  return activeSets(session?.game?.equipmentStats).map((set) => ({
    id: set.setId,
    name: set.name,
    grade: set.grade,
    pieces: set.pieces,
    complete: set.complete,
    bonus: Object.entries(set.bonus).map(([name, value]) => describeItemStats({ characteristics: { [name]: value } })[0]),
  }));
}

/** One row per grade the player can already use: scroll / crystal stock and what the shop asks. */
export function getScrollShopState(session) {
  const level = asNumber(session?.game?.stats?.lvl, 1);
  return equipmentTemplate.grades
    .filter((grade) => grade.name !== 'noGrade' && level >= grade.lvl.from)
    .map((grade) => ({
      grade: grade.name,
      plain: getMaterialCount(session, scrollKey(grade.name)),
      blessed: getMaterialCount(session, blessedKey(grade.name)),
      crystals: getMaterialCount(session, crystalKey(grade.name)),
      price: {
        plain: scrollPrice(grade.name),
        plainCrystals: scrollPrice(grade.name, { withCrystals: true }),
        blessed: scrollPrice(grade.name, { blessed: true }),
      },
    }));
}

export function getEquipmentState(session) {
  const items = getItems(session);
  const sanitized = items.map((item, index) => sanitizeItem(session, item, index));
  const equippedSlots = {};
  const resources = getResources(session);

  for (const [slot, equipped] of Object.entries(session?.game?.equipmentStats || {})) {
    if (!equipped) continue;
    equippedSlots[slot] = {
      name: equipped.name || 'Снаряжение',
      translatedName: equipped.translatedName || equipped.kind || 'Снаряжение',
      grade: equipped.grade || 'noGrade',
      mainType: equipped.mainType || 'equipment',
      kind: equipped.kind || null,
      forgeLevel: getEnchantLevel(equipped),
      enchant: getEnchantLevel(equipped),
    };
  }

  return {
    ...resources,
    resources,
    count: sanitized.length,
    equippedCount: sanitized.filter((item) => item.isUsed).length,
    maxForgeLevel: maxEnchantLevel(),
    maxEnchant: maxEnchantLevel(),
    equippedSlots,
    sets: getSetsState(session),
    items: sanitized,
    craft: getCraftState(session),
    scrollShop: getScrollShopState(session),
  };
}

const EQUIP_FAILURES = { 2: 'invalid_item', 3: 'wrong_class' };

export function performEquipmentAction(session, key, action, options = {}) {
  if (!ACTIONS.has(action)) {
    return { ok: false, reason: 'invalid_action', equipment: getEquipmentState(session) };
  }

  const resolved = resolveItem(session, key);
  if (!resolved) {
    return { ok: false, reason: 'stale_item', equipment: getEquipmentState(session) };
  }

  const { item, index } = resolved;
  const isEquipped = isActuallyEquipped(session, item);

  // Repair the stale flag left by the old text inventory before applying a new
  // mutation. Slot snapshots are the source used by combat stat calculations.
  if (Boolean(item.isUsed) !== isEquipped) item.isUsed = isEquipped;

  if (action === 'equip') {
    if (isEquipped) {
      return { ok: false, reason: 'already_equipped', equipment: getEquipmentState(session) };
    }

    const result = equipItem(session, item);
    if (result !== 0) {
      return { ok: false, reason: EQUIP_FAILURES[result] || 'equip_failed', equipment: getEquipmentState(session) };
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

  if (action === 'enchant') {
    const previous = getEnchantLevel(item);
    const result = enchantItem(session, item, { blessed: Boolean(options.blessed) });
    if (!result.ok) {
      return { ok: false, reason: result.reason, scroll: result.scroll, equipment: getEquipmentState(session) };
    }

    const destroyed = result.outcome === 'broken';
    return {
      ok: true,
      action,
      outcome: result.outcome,
      level: result.level,
      previous,
      chance: result.chance,
      crystals: result.crystals || 0,
      grade: item.grade,
      // A destroyed item has left the inventory, so there is no card left to show.
      item: destroyed ? null : sanitizeItem(session, item, index),
      equipment: getEquipmentState(session),
    };
  }

  if (action === 'crystallize') {
    const result = crystallizeItem(session, item);
    if (!result.ok) {
      return { ok: false, reason: result.reason, equipment: getEquipmentState(session) };
    }

    return { ok: true, action, crystals: result.crystals, grade: result.grade, equipment: getEquipmentState(session) };
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

// Crafting has no existing item to key against (it creates one), so it has its own exports.
function recipeRow(session, recipe) {
  const item = findCatalogItem(recipe.id);
  const craft = ensureCraft(session);
  const learned = isRecipeLearned(session, recipe);
  const level = asNumber(session?.game?.stats?.lvl, 1);
  return {
    id: recipe.id,
    name: item.name,
    translatedName: item.translatedName,
    grade: recipe.grade,
    mainType: item.mainType,
    category: item.category,
    kind: item.kind,
    slots: [...item.slots],
    lineage: item.lineage || null,
    successRate: recipe.successRate,
    gold: recipe.gold,
    learnPrice: recipe.learnPrice,
    craftLevel: recipe.craftLevel,
    minLevel: recipe.minLevel,
    learned,
    levelOk: level >= recipe.minLevel,
    craftLevelOk: craft.level >= recipe.craftLevel,
    materials: recipeMaterialRows(session, recipe),
    missing: missingForRecipe(session, recipe),
    canCraft: learned && level >= recipe.minLevel && craft.level >= recipe.craftLevel && !Object.keys(missingForRecipe(session, recipe)).length,
  };
}

export function getCraftState(session) {
  const craft = ensureCraft(session);
  return {
    level: craft.level,
    exp: craft.exp,
    needExp: craftNeedExp(craft.level),
    recipes: visibleRecipes(session).map((recipe) => recipeRow(session, recipe)),
  };
}

export function craftEquipmentItem(session, itemId) {
  if (!session?.game?.inventory) {
    return { ok: false, reason: 'player_not_found', equipment: getEquipmentState(session) };
  }

  const result = craftItem(session, itemId);
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      requiredLevel: result.requiredLevel,
      requiredCraftLevel: result.requiredCraftLevel,
      missing: result.missing,
      equipment: getEquipmentState(session),
    };
  }

  const items = getItems(session);
  return {
    ok: true,
    action: 'craft',
    success: result.success,
    exp: result.exp,
    leveledUp: result.leveledUp,
    item: result.item ? sanitizeItem(session, result.item, items.length - 1) : null,
    equipment: getEquipmentState(session),
  };
}

export function learnEquipmentRecipe(session, itemId) {
  if (!session?.game?.inventory) {
    return { ok: false, reason: 'player_not_found', equipment: getEquipmentState(session) };
  }
  const result = learnRecipe(session, itemId);
  if (!result.ok) {
    return { ok: false, reason: result.reason, requiredLevel: result.requiredLevel, requiredCraftLevel: result.requiredCraftLevel, equipment: getEquipmentState(session) };
  }
  return { ok: true, action: 'recipe', price: result.price, equipment: getEquipmentState(session) };
}

/** Buys (or, for blessed scrolls and crystal scrolls, makes) one enchant scroll of a grade. */
export function buyEnchantScroll(session, grade, options = {}) {
  if (!session?.game?.inventory) {
    return { ok: false, reason: 'player_not_found', equipment: getEquipmentState(session) };
  }

  const info = equipmentTemplate.grades.find((entry) => entry.name === grade);
  if (info && asNumber(session.game.stats?.lvl, 1) < info.lvl.from) {
    return { ok: false, reason: 'level_too_low', requiredLevel: info.lvl.from, equipment: getEquipmentState(session) };
  }

  const result = buyScroll(session, grade, options);
  if (!result.ok) {
    return { ok: false, reason: result.reason, price: result.price, equipment: getEquipmentState(session) };
  }

  return { ok: true, action: 'scroll', key: result.key, price: result.price, equipment: getEquipmentState(session) };
}
