// Flat gear stats (attack, defence, max hp / cp / mp) are written once per item kind in
// equipmentTemplate.js, but a character's own stats grow exponentially with level: a +40
// defence piece is a big share of a level-30 class and nothing at level 90. Flat stats are
// therefore scaled by how much the class stat has grown between the template's reference level
// and the level the item's grade is meant for, which keeps a piece worth about the same share
// of the character at every grade.
import equipmentTemplate from '../../../template/equipmentTemplate.js';

// The level the flat numbers of the item kinds (equipmentTemplate.js) are written for.
export const REFERENCE_LEVEL = 30;

// 1 keeps a roll worth the same share of the character at every grade; 0 switches the
// scaling off (the old behaviour). 0.8 gets most of the way without a sudden jump for
// players who already wear high-grade gear.
export const STRENGTH = 0.8;

// How each flat stat grows with level (shape of scaleClassStats.js, flat constants included).
const GROWTH = {
    attack: lvl => 3 * Math.pow(1.105, lvl - 1) + 8,
    defence: lvl => 3 * Math.pow(1.102, lvl - 1) + 6,
    maxHp: lvl => lvl,
    maxCp: lvl => lvl,
    maxMp: lvl => lvl,
};

export const SCALED_STATS = Object.freeze(Object.keys(GROWTH));

/** Mid-point of the levels a grade drops at. */
export function gradeLevel(gradeName) {
    const grade = equipmentTemplate.grades.find(item => item.name === gradeName);
    return grade ? (grade.lvl.from + grade.lvl.to) / 2 : REFERENCE_LEVEL;
}

/** Factor (1 = unchanged) a flat stat of an item of this grade is multiplied by. */
export default function gradeScale(statName, gradeName) {
    const growth = GROWTH[statName];
    if (!growth || !gradeName) return 1;
    return Math.pow(growth(gradeLevel(gradeName)) / growth(REFERENCE_LEVEL), STRENGTH);
}
