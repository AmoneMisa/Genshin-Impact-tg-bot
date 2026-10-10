// Characters made before the real Lineage 2 classes (the old 6 base classes and their 24 professions) are moved to
// the nearest real class by migrateSessionClass(); the old names also still resolve (resolveClassName) so older
// saved data, tests and tools keep working.
import classStats from '../../../template/classStatsTemplate.js';

// old class -> [real class for a hero below level 20, at 20+, at 40+]; a missing slot repeats the previous one.
const LEGACY = {
    warrior: ['humanFighter'],
    berserk: ['orcFighter', 'orcRaider'],
    mage: ['humanMystic'],
    priest: ['humanMystic', 'cleric'],
    archer: ['humanFighter', 'rogueProf', 'hawkeye'],
    rogue: ['humanFighter', 'rogueProf'],
    // 2nd professions of the old tree (level 20)
    crusader: ['humanKnight'],
    warden: ['humanKnight'],
    elementalist: ['humanWizard'],
    warlock: ['humanWizard', 'humanWizard', 'warlock'],
    cleric: ['cleric'],
    inquisitor: ['cleric'],
    ranger: ['rogueProf'],
    sniper: ['rogueProf'],
    assassin: ['assassin'],
    trickster: ['rogueProf'],
    slayer: ['warriorProf'],
    ironclad: ['monk'],
    // 3rd professions of the old tree (level 40)
    phoenixKnight: ['paladin'],
    bastion: ['paladin'],
    archmage: ['sorcerer'],
    soulReaper: ['necromancer'],
    saint: ['bishop'],
    judicator: ['prophet'],
    hawkeye: ['hawkeye'],
    phantomShot: ['silverRanger'],
    shadowBlade: ['treasureHunter'],
    phantomDancer: ['plainsWalker'],
    warbringer: ['gladiator'],
    titan: ['destroyer']
};
// old names that are real class names again keep their meaning only when this says so
const SAME_TIER = new Set(['cleric', 'assassin', 'hawkeye']);

const known = new Map(classStats.map(item => [item.name, item]));

/** The real class an old class name stands for at a level (the name itself when it is already a real class). */
export function legacyTarget(name, level = 1) {
    const row = LEGACY[name];
    if (!row) return known.has(name) ? name : null;
    if (known.has(name) && SAME_TIER.has(name)) return name;
    const index = level >= 40 ? 2 : level >= 20 ? 1 : 0;
    return row[Math.min(index, row.length - 1)];
}

/** A class name that exists in the template: legacy names are resolved, unknown ones fall back to `noClass`. */
export function resolveClassName(name, level = 1) {
    if (!name) return 'noClass';
    if (known.has(name)) return name;
    const target = legacyTarget(name, level);
    return target && known.has(target) ? target : 'noClass';
}

export const isLegacyClassName = name => Boolean(LEGACY[name]) && !SAME_TIER.has(name);
export const CLASS_SYSTEM_VERSION = 2;
