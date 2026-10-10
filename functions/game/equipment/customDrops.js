// The custom armor line (template/customSets.js) also drops from monsters, but less often than the finished
// Lineage 2 equipment: a kill rolls one custom part at CUSTOM_DROP_SHARE of what a monster of the same grade band
// pays in equipment items (the mean of the summed full item, piece and recipe rows of the real drop tables).
import equipmentTemplate from '../../../template/equipmentTemplate.js';
import hunting from '../../../template/huntingTemplate.js';
import {lootRows} from '../hunt/lootTable.js';
import {getCatalog, canClassUse} from './catalog.js';

export const CUSTOM_DROP_SHARE = 0.5;
// used for a grade band where no monster drops finished items
const FALLBACK_PERCENT = 0.02;
const CLASS_FIT_CHANCE = 0.85;

const gradeOfLevel = level => equipmentTemplate.grades.find(grade => grade.lvl.from <= level && level <= grade.lvl.to) || equipmentTemplate.grades.at(-1);

let realByGrade = null;
/** Mean summed chance (percent) of real equipment items, pieces and recipes per kill, by grade of the monster's level. */
export function realFullChance(gradeName) {
    if (!realByGrade) {
        const sums = {};
        for (const mob of hunting.flatMap(zone => zone.mobs)) {
            const total = lootRows(mob.id).filter(row => ['full', 'piece', 'recipe'].includes(row.kind)).reduce((sum, row) => sum + row.chance, 0);
            if (total > 0) (sums[gradeOfLevel(mob.level).name] ||= []).push(total);
        }
        realByGrade = {};
        for (const grade of equipmentTemplate.grades) {
            const list = sums[grade.name];
            realByGrade[grade.name] = list?.length ? list.reduce((a, b) => a + b, 0) / list.length : FALLBACK_PERCENT / CUSTOM_DROP_SHARE;
        }
    }
    return realByGrade[gradeName] ?? 0;
}

/** Percent chance per kill (before the server drop rate and the level gap) that a monster of this level drops a custom part. */
export function customDropChance(mobLevel) {
    return realFullChance(gradeOfLevel(mobLevel).name) * CUSTOM_DROP_SHARE;
}

/** The catalog definition of the part a drop gives, preferring what the killer's class can wear. */
export function pickCustomPart(mobLevel, className, random = Math.random) {
    let pool = getCatalog().filter(item => item.custom && item.grade === gradeOfLevel(mobLevel).name);
    if (className && random() < CLASS_FIT_CHANCE) {
        const usable = pool.filter(item => canClassUse(className, item));
        if (usable.length) pool = usable;
    }
    return pool[Math.floor(random() * pool.length)] || null;
}
