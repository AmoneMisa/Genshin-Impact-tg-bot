// Lineage 2 enchanting: scrolls of the item's grade, a safe range, a chance to destroy the item above
// it (blessed scrolls only drop it back to the safe level) and crystals from broken gear.
import equipmentTemplate from '../../../template/equipmentTemplate.js';
import { getMaterialCount, spendMaterials, addMaterial } from '../player/materials.js';
import { gradeInfo, slotShareKey } from './catalog.js';
import { getEnchantLevel, maxEnchantLevel, safeEnchantLevel } from './itemBonuses.js';
import { isActuallyEquipped, syncEquippedSnapshot } from './snapshots.js';
import unequipItem from './unequipItem.js';

export const scrollKey = grade => `scroll_${grade}`;
export const blessedKey = grade => `blessed_${grade}`;
export const crystalKey = grade => `crystal_${grade}`;

/** Typed scrolls fit weapons or everything else (armor, shields, jewelry), as in Lineage II. */
export const scrollTarget = item => (item?.mainType === 'weapon' ? 'weapon' : 'armor');
export const blessedTypedKey = item => `blessed_${scrollTarget(item)}_${item.grade}`;
export const safeTypedKey = item => `safe_${scrollTarget(item)}_${item.grade}`;

const config = () => equipmentTemplate.enchant;

/** No-grade gear has no scrolls or crystals (as in Lineage 2). */
export function isEnchantable(item) {
    return Boolean(item) && item.grade !== 'noGrade' && Boolean(gradeInfo(item.grade));
}

/** Chance that the next scroll works: certain up to the safe level, `chance` above it. */
export function enchantChance(item) {
    return getEnchantLevel(item) < safeEnchantLevel(item) ? 1 : config().chance;
}

/** Crystals the item falls apart into (the grade's crystals by what kind of item it is). */
export function crystalYield(item) {
    const grade = gradeInfo(item?.grade);
    if (!grade) return 0;
    return Math.round(grade.crystals * (config().crystalShare[slotShareKey(item)] ?? 0.3));
}

function removeFromInventory(session, item) {
    const items = session?.game?.inventory?.equipment?.items;
    const index = Array.isArray(items) ? items.indexOf(item) : -1;
    if (index >= 0) items.splice(index, 1);
    return index >= 0;
}

/** Takes an item out of the game for good, unequipping it first. */
function destroy(session, item) {
    if (item.isUsed || isActuallyEquipped(session, item)) unequipItem(session, item);
    return removeFromInventory(session, item);
}

/**
 * Reads one scroll of the item's grade and tries to raise the item by a level.
 *   success  the level goes up (always up to the safe level, `chance` above it)
 *   reset    blessed scroll failed: the level falls back to the safe one, the item survives
 *   kept     indestructible scroll failed: the item survives and keeps its level
 *   broken   plain scroll failed: the item is destroyed and gives crystals
 *
 * `scroll` picks the typed scrolls of the Donate shop: 'blessedTyped' (weapon or armor, like a blessed
 * scroll) and 'safeTyped' (indestructible). Without it `blessed` chooses the generic blessed scroll.
 */
export function enchantItem(session, item, { blessed = false, scroll = null } = {}) {
    if (!isEnchantable(item)) return { ok: false, reason: 'not_enchantable' };

    const level = getEnchantLevel(item);
    if (level >= maxEnchantLevel()) return { ok: false, reason: 'max_level' };

    const key = scroll === 'safeTyped' ? safeTypedKey(item)
        : scroll === 'blessedTyped' ? blessedTypedKey(item)
            : blessed ? blessedKey(item.grade) : scrollKey(item.grade);
    const resets = blessed || scroll === 'blessedTyped';
    if (!spendMaterials(session, { [key]: 1 })) return { ok: false, reason: 'no_scroll', scroll: key };

    const chance = enchantChance(item);
    if (Math.random() < chance) {
        item.enchant = level + 1;
        syncEquippedSnapshot(session, item);
        return { ok: true, outcome: 'success', level: item.enchant, chance };
    }

    if (scroll === 'safeTyped') {
        return { ok: true, outcome: 'kept', level, chance };
    }

    if (resets) {
        item.enchant = Math.min(level, safeEnchantLevel(item));
        syncEquippedSnapshot(session, item);
        return { ok: true, outcome: 'reset', level: item.enchant, previous: level, chance };
    }

    const crystals = crystalYield(item);
    destroy(session, item);
    addMaterial(session, crystalKey(item.grade), crystals);
    return { ok: true, outcome: 'broken', level, crystals, chance, grade: item.grade };
}

/** Breaks an item down into crystals on purpose. */
export function crystallizeItem(session, item) {
    if (!isEnchantable(item)) return { ok: false, reason: 'not_enchantable' };
    const crystals = crystalYield(item);
    destroy(session, item);
    addMaterial(session, crystalKey(item.grade), crystals);
    return { ok: true, crystals, grade: item.grade };
}

/**
 * Gold price of the scroll shop. A plain scroll costs gold, or a few crystals of its grade; a
 * blessed scroll costs more crystals and double the gold.
 */
export function scrollPrice(grade, { blessed = false, withCrystals = false } = {}) {
    const info = gradeInfo(grade);
    if (!info || grade === 'noGrade') return null;
    if (blessed) return { gold: info.scrollGold * config().blessedGoldMultiplier, crystals: config().blessedCrystals };
    if (withCrystals) return { gold: 0, crystals: config().plainCrystals };
    return { gold: info.scrollGold, crystals: 0 };
}

export function buyScroll(session, grade, options = {}) {
    const price = scrollPrice(grade, options);
    if (!price) return { ok: false, reason: 'unknown_grade' };

    const inventory = session.game.inventory;
    if ((Number(inventory.gold) || 0) < price.gold) return { ok: false, reason: 'not_enough_gold', price };
    if (getMaterialCount(session, crystalKey(grade)) < price.crystals) return { ok: false, reason: 'not_enough_crystals', price };

    inventory.gold -= price.gold;
    if (price.crystals) spendMaterials(session, { [crystalKey(grade)]: price.crystals });
    const key = options.blessed ? blessedKey(grade) : scrollKey(grade);
    addMaterial(session, key, 1);
    return { ok: true, key, price };
}
