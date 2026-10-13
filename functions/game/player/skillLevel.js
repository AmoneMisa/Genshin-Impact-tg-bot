import DATA from '../../../template/l2SkillEnchantData.js';
// Level and power of a real Lineage II skill (High Five) for a hero of a given level. A skill of the real tree has
// several levels, each opening at its own character level (template/l2Classes.js `learn`), and every level has its
// own power. The kit skills that carry `l2Id` use this: the hero casts the highest level they have learned.
import l2 from '../../../template/l2Classes.js';

/** Skill id -> Map(level -> the lowest character level at which any class learns it). */
let needs = null;
function index() {
    if (needs) return needs;
    needs = new Map();
    for (const rows of Object.values(l2.learn)) {
        for (const [id, level, need] of rows) {
            const key = String(id);
            const levels = needs.get(key) || needs.set(key, new Map()).get(key);
            levels.set(level, Math.min(levels.get(level) ?? Infinity, need));
        }
    }
    return needs;
}

/** A skill level farther below the monster than this stops working: see skillLevelPenalty. */
export const LEVEL_TOLERANCE = 8;

/**
 * {level, maxLevel, power, maxPower, magicLvl} of the skill for a hero of that level, or null when `l2Id` is not a
 * real skill. `magicLvl` is the character level that taught the level in use (the real `magicLvl` of the skill).
 */
export function l2SkillAt(l2Id, heroLevel) {
    if (l2Id === undefined || l2Id === null) return null;
    const info = l2.skills[String(l2Id)];
    if (!info) return null;
    const levels = [...(index().get(String(l2Id))?.entries() || [])].sort((a, b) => a[0] - b[0]);
    const maxLevel = info.levels || levels.at(-1)?.[0] || 1;
    let level = 1;
    let magicLvl = levels[0]?.[1] ?? 1;
    for (const [lvl, need] of levels) {
        if (need <= heroLevel) { level = lvl; magicLvl = need; }
    }
    const powers = Array.isArray(info.power) ? info.power : [];
    const power = Number(powers[Math.min(level, powers.length) - 1]) || 0;
    const maxPower = Number(powers.at(-1)) || 0;
    return {level, maxLevel, power, maxPower, magicLvl};
}

/**
 * The share of a skill's damage a hero of `heroLevel` deals with it: the lower levels of a skill are weaker
 * (0.6 of its top damage at the first level, up to 1 at the last).
 */
export function skillPowerFactor(skill, heroLevel) {
    const at = l2SkillAt(skill?.l2Id, heroLevel);
    if (!at || !(at.maxPower > 0)) return 1;
    return 0.6 + 0.4 * Math.min(1, at.power / at.maxPower);
}

/**
 * Against a monster far above the level the skill was taught at, the skill is almost useless (Lineage II: a low
 * level skill does little to a high level monster). Returns {factor, missChance}: the damage share and the chance
 * to miss. The basic attack and skills that are not real ones are never cut.
 */
export function skillLevelPenalty(skill, mobLevel, heroLevel) {
    if (!skill || skill.effect === 'common_attack' || !skill.l2Id || !(mobLevel > 0)) return {factor: 1, missChance: 0};
    const at = l2SkillAt(skill.l2Id, heroLevel);
    if (!at) return {factor: 1, missChance: 0};
    // a skill the hero enchanted counts as taught later: the route and the enchant tiers keep it useful
    const taught = skill.enchantLevel>0 ? Number(DATA.skills[skill.l2Id]?.routes[skill.l2EnchantRoute]?.steps[skill.enchantLevel-1]?.fields.magicLevel)||at.magicLvl : at.magicLvl;
    const over = mobLevel - taught - LEVEL_TOLERANCE;
    if (over <= 0) return {factor: 1, missChance: 0};
    return {factor: Math.max(0, 1 - over * 0.12), missChance: Math.min(0.9, over * 0.1)};
}
