import getEquipStatByName from './getters/getEquipStatByName.js';
import {soulSkillCost} from '../equipment/soulCrystalCombat.js';
/**
 * Lineage2-style skill enchanting: spend gold + crystals + ironOre + SP (skill
 * points, earned on level-up and from bosses — see setLevel.js / bossSendLoot.js)
 * to permanently raise a specific skill's power and lower its mp/hp cost and
 * cooldown. Higher levels also demand specific items (inventory.materials):
 *
 *   level 4-7   : Свиток мастерства (skill_scroll) x1..4
 *   level 8-10  : Древняя печать (ancient_seal) x1..3
 *   level 8-10  : plus the skill's own `enchantItem` (a boss essence) for the
 *                 profession ultimates
 *
 * Skills taught by the 2nd/3rd profession (`skill.tier`) cost more gold and SP.
 *
 * The enchant level is stored directly on the player's own skill instance
 * (session.game.gameClass.skills[slot].enchantLevel) rather than on the shared
 * template, and read here at calculation time instead of baking it into
 * skill.damageModifier/cost/cooldown — updatePlayerSkills.js's admin refresh
 * (Object.assign(skill, template[skill.slot])) only overwrites template-defined
 * keys, so enchantLevel survives a template rebalance untouched.
 */
import {getMaterialCount, spendMaterials} from './materials.js';
import {getRouteBonus} from './skillRoutes.js';

export const SKILL_ENCHANT_MAX_LEVEL = 10;

const POWER_PER_LEVEL = 0.05;          // +5% skill power per enchant level
const COST_REDUCTION_PER_LEVEL = 0.02; // -2% mp/hp cost per enchant level (max -20%)
const COOLDOWN_REDUCTION_PER_LEVEL = 0.02; // -2% cooldown per enchant level (max -20%)

// gold/crystals/ironOre/sp needed to go from level N to N+1: base * (N+1) * tier factor.
const ENCHANT_COST_BASE = { gold: 2000, crystals: 5, ironOre: 15, sp: 20 };
const TIER_COST_MULTIPLIER = {1: 1, 2: 1.5, 3: 2};

export function getSkillEnchantLevel(skill) {
    return Math.max(0, Math.min(SKILL_ENCHANT_MAX_LEVEL, skill?.enchantLevel || 0));
}

export function getPowerMultiplierAtLevel(level) {
    return 1 + Math.max(0, level) * POWER_PER_LEVEL;
}

export function getSkillPowerMultiplier(skill) {
    return getPowerMultiplierAtLevel(getSkillEnchantLevel(skill)) * (1 + getRouteBonus(skill).power);
}

export function getSkillCostMultiplier(skill) {
    return (1 - getSkillEnchantLevel(skill) * COST_REDUCTION_PER_LEVEL) * (1 - getRouteBonus(skill).cost);
}

export function getSkillCooldownMultiplier(skill) {
    return (1 - getSkillEnchantLevel(skill) * COOLDOWN_REDUCTION_PER_LEVEL) * (1 - getRouteBonus(skill).cooldown);
}

// mp/hp cost after the enchant's cost reduction — never below 1 if the base
// cost was itself positive, so a skill can never become fully free. `maxHp`
// turns a percentage hp cost (`costHpPct`) into points.
export function getEffectiveSkillCost(skill, maxHp = 0, session = null) {
    const multiplier = getSkillCostMultiplier(skill);
    const baseCost = skill?.cost > 0 ? Math.max(1, Math.floor(skill.cost * multiplier * (session?getEquipStatByName(session,'skillMpCostMul',true):1))) : 0;
    const cost=session?soulSkillCost(session,skill,baseCost):baseCost;
    const baseHp = Math.max(skill?.costHp > 0 ? skill.costHp : 0, skill?.costHpPct > 0 ? Math.ceil(maxHp * skill.costHpPct) : 0);
    const costHp = baseHp > 0 ? Math.max(1, Math.floor(baseHp * multiplier)) : 0;
    return { cost, costHp };
}

/** Items (material key -> count) the step to `level` demands on top of the currencies. */
export function getEnchantItems(skill, level) {
    const items = {};
    if (level >= 4 && level <= 7) items.skill_scroll = level - 3;
    if (level >= 8) {
        items.ancient_seal = level - 7;
        if (skill?.enchantItem?.key) {
            items[skill.enchantItem.key] = Math.max(1, skill.enchantItem.perLevel || 1) * (level - 7);
        }
    }
    return items;
}

// Resources required to enchant `skill` from its current level to the next
// one, or null when already at SKILL_ENCHANT_MAX_LEVEL. `items` is present only
// when the step needs materials.
export function getSkillEnchantCost(skill) {
    const level = getSkillEnchantLevel(skill);
    if (level >= SKILL_ENCHANT_MAX_LEVEL) {
        return null;
    }
    const scale = level + 1;
    const tier = TIER_COST_MULTIPLIER[skill?.tier] || 1;
    const cost = {
        gold: Math.round(ENCHANT_COST_BASE.gold * scale * tier),
        crystals: ENCHANT_COST_BASE.crystals * scale,
        ironOre: ENCHANT_COST_BASE.ironOre * scale,
        sp: Math.round(ENCHANT_COST_BASE.sp * scale * tier),
    };
    const items = getEnchantItems(skill, scale);
    if (Object.keys(items).length) cost.items = items;
    return cost;
}

// Attempts to enchant a skill by one level, deducting resources from the
// player's inventory. Mutates `skill`/`inventory` in place; caller saves.
export function enchantSkill(skill, inventory) {
    const cost = getSkillEnchantCost(skill);
    if (!cost) {
        return { ok: false, reason: "max_level" };
    }

    if ((inventory.gold || 0) < cost.gold) {
        return { ok: false, reason: "not_enough_gold", cost };
    }
    if ((inventory.crystals || 0) < cost.crystals) {
        return { ok: false, reason: "not_enough_crystals", cost };
    }
    if ((inventory.ironOre || 0) < cost.ironOre) {
        return { ok: false, reason: "not_enough_iron_ore", cost };
    }
    if ((inventory.sp || 0) < cost.sp) {
        return { ok: false, reason: "not_enough_sp", cost };
    }

    const owner = {game: {inventory}};
    const missing = Object.entries(cost.items || {}).filter(([key, amount]) => getMaterialCount(owner, key) < amount);
    if (missing.length) {
        return { ok: false, reason: "not_enough_items", cost, missing: Object.fromEntries(missing) };
    }

    inventory.gold -= cost.gold;
    inventory.crystals -= cost.crystals;
    inventory.ironOre -= cost.ironOre;
    inventory.sp -= cost.sp;
    spendMaterials(owner, cost.items);
    skill.enchantLevel = getSkillEnchantLevel(skill) + 1;

    return { ok: true, level: skill.enchantLevel, cost };
}
