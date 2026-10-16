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

/**
 * What a custom drop of a monster of this level can be, for the drop table: one row per armor type (heavy, light,
 * robe) named after the set of the grade, with the share of the custom roll that type takes.
 */
export function customPartRows(mobLevel, className=null) {
    const grade = gradeOfLevel(mobLevel).name;
    const pool = getCatalog().filter(item => item.custom && item.grade === grade);
    const usable=className?pool.filter(item=>canClassUse(className,item)):[];
    const byType = new Map();
    for (const item of pool) {
        const entry = byType.get(item.kind) || byType.set(item.kind, {count: 0, item}).get(item.kind);
        entry.count++;
    }
    return [...byType.entries()].map(([type, {count, item}]) => ({
        key: `custom:${grade}:${type}`,
        name: `${item.setName || 'Custom Set'} · Part`,
        icon: '🛡️',
        kind: 'full',
        min: 1,
        max: 1,
        share: usable.length?CLASS_FIT_CHANCE*usable.filter(i=>i.kind===type).length/usable.length+(1-CLASS_FIT_CHANCE)*count/pool.length:count/pool.length,
        grade,
        armorType: type
    }));
}
