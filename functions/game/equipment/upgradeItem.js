/**
 * Forge item upgrading: permanently scales up an existing item's rolled
 * bonus stats (item.stats[] — the gacha/craft random rolls, now that
 * getEquipStatByName.js actually applies them to combat). Deliberately
 * leaves `characteristics` (the fixed per-weapon-type base values, shared by
 * every item of that kind) untouched — this upgrades what's unique about
 * THIS item, not the weapon type itself.
 */

export const MAX_UPGRADE_LEVEL = 10;
const POWER_PER_LEVEL = 0.08; // +8% to every rolled stat's bonus, per level

const UPGRADE_BASE_COST = {gold: 3000, crystals: 8, ironOre: 25};
const GRADE_COST_MULTIPLIER = {
    noGrade: 1, D: 2, C: 4, B: 7, A: 12, S: 20, SS: 32, SSS: 50,
};

// "Mul"-suffixed stats (and incomingDamageModifier) are stored as a factor
// near 1 (e.g. 1.08 = +8%) — mirrors getItemString.js's getStr() convention.
// Everything else is a flat point value.
function isFactorStat(name) {
    return /Mul$/.test(name) || name === "incomingDamageModifier";
}

function scaleStatValue(name, value, multiplier) {
    return isFactorStat(name) ? 1 + (value - 1) * multiplier : value * multiplier;
}

export function getItemUpgradeLevel(item) {
    return Math.max(0, Math.min(MAX_UPGRADE_LEVEL, item?.forgeLevel || 0));
}

export function getItemUpgradeCost(item) {
    const level = getItemUpgradeLevel(item);
    if (level >= MAX_UPGRADE_LEVEL) {
        return null;
    }
    const gradeMultiplier = GRADE_COST_MULTIPLIER[item?.grade] || 1;
    const scale = (level + 1) * gradeMultiplier;
    return {
        gold: UPGRADE_BASE_COST.gold * scale,
        crystals: UPGRADE_BASE_COST.crystals * scale,
        ironOre: UPGRADE_BASE_COST.ironOre * scale,
    };
}

/**
 * Upgrades `item` by one level, deducting resources from `inventory`.
 * Mutates `item`/`inventory` in place; caller persists.
 */
export default function upgradeItem(item, inventory) {
    if (!item) {
        return {ok: false, reason: "unknown_item"};
    }
    if (!Array.isArray(item.stats) || !item.stats.length) {
        return {ok: false, reason: "nothing_to_upgrade"};
    }

    const cost = getItemUpgradeCost(item);
    if (!cost) {
        return {ok: false, reason: "max_level"};
    }

    if ((inventory.gold || 0) < cost.gold) {
        return {ok: false, reason: "not_enough_gold", cost};
    }
    if ((inventory.crystals || 0) < cost.crystals) {
        return {ok: false, reason: "not_enough_crystals", cost};
    }
    if ((inventory.ironOre || 0) < cost.ironOre) {
        return {ok: false, reason: "not_enough_iron_ore", cost};
    }

    inventory.gold -= cost.gold;
    inventory.crystals -= cost.crystals;
    inventory.ironOre -= cost.ironOre;

    for (const stat of item.stats) {
        stat.value = scaleStatValue(stat.name, stat.value, 1 + POWER_PER_LEVEL);
    }
    item.forgeLevel = getItemUpgradeLevel(item) + 1;

    return {ok: true, level: item.forgeLevel, cost};
}
