/**
 * Lineage2-style skill enchanting: spend gold + crystals + ironOre + SP (skill
 * points, earned on level-up — see setLevel.js) to permanently raise a specific
 * skill's power and lower its mp/hp cost and cooldown.
 *
 * The enchant level is stored directly on the player's own skill instance
 * (session.game.gameClass.skills[slot].enchantLevel) rather than on the shared
 * template, and read here at calculation time instead of baking it into
 * skill.damageModifier/cost/cooldown — updatePlayerSkills.js's admin refresh
 * (Object.assign(skill, template[skill.slot])) only overwrites template-defined
 * keys, so enchantLevel survives a template rebalance untouched.
 */

export const SKILL_ENCHANT_MAX_LEVEL = 10;

const POWER_PER_LEVEL = 0.05;          // +5% skill power per enchant level
const COST_REDUCTION_PER_LEVEL = 0.02; // -2% mp/hp cost per enchant level (max -20%)
const COOLDOWN_REDUCTION_PER_LEVEL = 0.02; // -2% cooldown per enchant level (max -20%)

// gold/crystals/ironOre/sp needed to go from level N to N+1: base * (N+1).
const ENCHANT_COST_BASE = { gold: 2000, crystals: 5, ironOre: 15, sp: 20 };

export function getSkillEnchantLevel(skill) {
    return Math.max(0, Math.min(SKILL_ENCHANT_MAX_LEVEL, skill?.enchantLevel || 0));
}

export function getPowerMultiplierAtLevel(level) {
    return 1 + Math.max(0, level) * POWER_PER_LEVEL;
}

export function getSkillPowerMultiplier(skill) {
    return getPowerMultiplierAtLevel(getSkillEnchantLevel(skill));
}

export function getSkillCostMultiplier(skill) {
    return 1 - getSkillEnchantLevel(skill) * COST_REDUCTION_PER_LEVEL;
}

export function getSkillCooldownMultiplier(skill) {
    return 1 - getSkillEnchantLevel(skill) * COOLDOWN_REDUCTION_PER_LEVEL;
}

// mp/hp cost after the enchant's cost reduction — never below 1 if the base
// cost was itself positive, so a skill can never become fully free.
export function getEffectiveSkillCost(skill) {
    const multiplier = getSkillCostMultiplier(skill);
    const cost = skill?.cost > 0 ? Math.max(1, Math.floor(skill.cost * multiplier)) : 0;
    const costHp = skill?.costHp > 0 ? Math.max(1, Math.floor(skill.costHp * multiplier)) : 0;
    return { cost, costHp };
}

// Resources required to enchant `skill` from its current level to the next
// one, or null when already at SKILL_ENCHANT_MAX_LEVEL.
export function getSkillEnchantCost(skill) {
    const level = getSkillEnchantLevel(skill);
    if (level >= SKILL_ENCHANT_MAX_LEVEL) {
        return null;
    }
    const scale = level + 1;
    return {
        gold: ENCHANT_COST_BASE.gold * scale,
        crystals: ENCHANT_COST_BASE.crystals * scale,
        ironOre: ENCHANT_COST_BASE.ironOre * scale,
        sp: ENCHANT_COST_BASE.sp * scale,
    };
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

    inventory.gold -= cost.gold;
    inventory.crystals -= cost.crystals;
    inventory.ironOre -= cost.ironOre;
    inventory.sp -= cost.sp;
    skill.enchantLevel = getSkillEnchantLevel(skill) + 1;

    return { ok: true, level: skill.enchantLevel, cost };
}
