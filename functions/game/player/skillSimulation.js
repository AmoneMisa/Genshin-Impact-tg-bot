// Helpers for the PvP / arena simulations, which play a class's skills as a
// simple damage rotation. Profession skills add buffs, debuffs and hp-percentage
// costs the simulations do not model: those skills must not be counted as damage
// dealers, and their hp cost has to be turned into points.
export function dealsDamage(skill) {
    return skill.isDealDamage !== false
        && !skill.isHeal && !skill.isShield && !skill.isBuff
        && !skill.restoreMp
        && !(skill.debuff && !skill.damageModifier);
}

export function hpCostOf(skill, maxHp) {
    return Math.max(skill.costHp || 0, skill.costHpPct ? Math.ceil(skill.costHpPct * (maxHp || 0)) : 0);
}
