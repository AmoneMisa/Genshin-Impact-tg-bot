import equipmentTemplate from '../../../template/equipmentTemplate.js';
import { canClassUse, findCatalogItem, getCatalog, instantiate } from './catalog.js';

// Where drops come from: how likely each kind of item is (weapon / armor / shield / jewellery).
const MAIN_TYPE_WEIGHT = {weapon: 0.3, armor: 0.4, shield: 0.1, jewelry: 0.2};
// A drop is picked among items the player's class can use this often; the rest is anything.
const CLASS_FIT_CHANCE = 0.85;
const LUCKY_GRADE_CHANCE = 0.05;

/**
 * Picks an item of the catalog.
 *   currentLvl  the player's level: it chooses the grade when none is given
 *   grade       a grade name to roll in (5% of the time the item is one grade better, unless exact)
 *   options     { forClass, exact, mainType, itemId }
 */
export default function generateRandomEquipment(currentLvl, grade, options = {}) {
    if (options.itemId) {
        const definition = findCatalogItem(options.itemId);
        if (!definition) throw new Error(`Не найден предмет каталога: ${options.itemId}`);
        return instantiate(definition);
    }

    const chosenGrade = pickGrade(currentLvl, grade, options.exact);
    // Epic jewellery only drops from its raid boss.
    let pool = getCatalog().filter(item => item.grade === chosenGrade.name && !item.epic);

    const mainType = options.mainType || pickMainType(pool);
    pool = pool.filter(item => item.mainType === mainType);

    if (options.forClass && Math.random() < CLASS_FIT_CHANCE) {
        const usable = pool.filter(item => canClassUse(options.forClass, item));
        if (usable.length) pool = usable;
    }

    return instantiate(pool[Math.floor(Math.random() * pool.length)]);
}

function pickGrade(currentLvl, calledGrade, exact = false) {
    const grades = equipmentTemplate.grades;
    let current;

    if (calledGrade) {
        current = grades.find(grade => grade.name.toLowerCase() === String(calledGrade).toLowerCase());
        if (!current) throw new Error(`Не найден такой грейд: ${calledGrade}`);
    } else {
        current = grades.find(grade => grade.lvl.from <= currentLvl && currentLvl <= grade.lvl.to)
            || grades[currentLvl < grades[0].lvl.from ? 0 : grades.length - 1];
    }

    // A lucky roll bumps the item one grade up - but never past the top grade.
    let index = grades.indexOf(current);
    if (!exact && Math.random() < LUCKY_GRADE_CHANCE && index < grades.length - 1) index++;
    return grades[index];
}

function pickMainType(pool) {
    const available = [...new Set(pool.map(item => item.mainType))];
    const total = available.reduce((sum, type) => sum + (MAIN_TYPE_WEIGHT[type] || 0.1), 0);
    let roll = Math.random() * total;
    for (const type of available) {
        roll -= MAIN_TYPE_WEIGHT[type] || 0.1;
        if (roll <= 0) return type;
    }
    return available[available.length - 1];
}
