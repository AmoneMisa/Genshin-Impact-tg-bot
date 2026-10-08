// Bosses drop the Lineage 2 enchanting materials of the grade a fighter currently plays in:
// scrolls (the main source besides the shop), the rare blessed scroll and a few crystals.
import equipmentTemplate from '../../../template/equipmentTemplate.js';
import getRandom from '../../getters/getRandom.js';
import { addMaterial, materialInfo } from '../player/materials.js';
import { AUGMENT_GRADES, lifestoneKey } from './augment.js';
import { blessedKey, crystalKey, scrollKey } from './enchantItem.js';

export const ENCHANT_DROPS = Object.freeze({
    scroll: {chance: 0.35, min: 1, max: 2},
    blessed: {chance: 0.04, min: 1, max: 1},
    crystal: {chance: 0.5, min: 1, max: 4},
    lifestone: {chance: 0.025, min: 1, max: 1},
});

/** The grade of the gear a character of this level wears, or null below the first enchantable one. */
export function enchantGradeForLevel(level) {
    const grade = equipmentTemplate.grades.find(entry => entry.lvl.from <= level && level <= entry.lvl.to)
        || (level > equipmentTemplate.grades.at(-1).lvl.to ? equipmentTemplate.grades.at(-1) : null);
    return grade && grade.name !== 'noGrade' ? grade.name : null;
}

/**
 * Rolls and credits the drops of one fighter. Harder bosses (tier 1-3) drop more of everything and
 * the top three damage dealers have better odds.
 */
export function rollEnchantDrops(member, {tier = 1, place = 10, random = Math.random} = {}) {
    const grade = enchantGradeForLevel(member?.game?.stats?.lvl || 1);
    if (!grade) return [];

    const luck = place <= 3 ? 1.5 : 1;
    const drops = [];
    const table = [
        [scrollKey(grade), ENCHANT_DROPS.scroll],
        [blessedKey(grade), ENCHANT_DROPS.blessed],
        [crystalKey(grade), ENCHANT_DROPS.crystal],
        ...(AUGMENT_GRADES.includes(grade) ? [[lifestoneKey(grade), ENCHANT_DROPS.lifestone]] : []),
    ];
    for (const [key, drop] of table) {
        if (random() >= Math.min(1, drop.chance * luck * (key.startsWith('blessed') || key.startsWith('lifestone') ? tier : 1))) continue;
        const amount = getRandom(drop.min, drop.max) * (key.startsWith('blessed') ? 1 : tier);
        addMaterial(member, key, amount);
        const info = materialInfo(key);
        drops.push({item: key, name: info.name, icon: info.icon, amount});
    }
    return drops;
}
