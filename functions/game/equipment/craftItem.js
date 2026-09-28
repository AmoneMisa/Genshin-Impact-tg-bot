import equipmentTemplate from '../../../template/equipmentTemplate.js';
import generateRandomEquipment from './generateRandomEquipment.js';

/**
 * Gold/crystals/ironOre cost to craft one item of a given grade at the forge.
 * Scales with the grade's tier — noGrade is cheap and always available,
 * SSS requires real investment. Independent of equipmentTemplate.grades[].cost,
 * which is a rolled item's dynamic resale value, not a crafting price.
 */
export const CRAFT_COSTS = {
    noGrade: {gold: 500, crystals: 0, ironOre: 20},
    D: {gold: 2000, crystals: 5, ironOre: 80},
    C: {gold: 6000, crystals: 15, ironOre: 200},
    B: {gold: 15000, crystals: 40, ironOre: 450},
    A: {gold: 40000, crystals: 90, ironOre: 900},
    S: {gold: 90000, crystals: 180, ironOre: 1800},
    SS: {gold: 180000, crystals: 350, ironOre: 3200},
    SSS: {gold: 400000, crystals: 700, ironOre: 6000},
};

// Grades a player may craft at their current level: every grade whose level
// range they've already reached, same gate generateRandomEquipment uses when
// no explicit grade is requested.
export function getCraftableGrades(playerLevel) {
    return equipmentTemplate.grades.filter(grade => playerLevel >= grade.lvl.from);
}

export function canAffordCraft(inventory, grade) {
    const cost = CRAFT_COSTS[grade];
    if (!cost) {
        return false;
    }
    return (inventory.gold || 0) >= cost.gold
        && (inventory.crystals || 0) >= cost.crystals
        && (inventory.ironOre || 0) >= cost.ironOre;
}

/**
 * Crafts a new random equipment item of `grade` and pushes it into
 * `inventory.equipment.items`, deducting the cost. Mutates `inventory` in
 * place; caller is responsible for persisting.
 */
export default function craftItem(inventory, grade, playerLevel) {
    const gradeTemplate = equipmentTemplate.grades.find(g => g.name === grade);
    if (!gradeTemplate) {
        return {ok: false, reason: "unknown_grade"};
    }
    if (playerLevel < gradeTemplate.lvl.from) {
        return {ok: false, reason: "level_too_low", requiredLevel: gradeTemplate.lvl.from};
    }

    const cost = CRAFT_COSTS[grade];
    if (!canAffordCraft(inventory, grade)) {
        return {ok: false, reason: "not_enough_resources", cost};
    }

    inventory.gold -= cost.gold;
    inventory.crystals -= cost.crystals;
    inventory.ironOre -= cost.ironOre;

    if (!inventory.equipment) {
        inventory.equipment = {name: "Экипировка", items: []};
    }
    const item = generateRandomEquipment(playerLevel, grade);
    inventory.equipment.items.push(item);

    return {ok: true, item, cost};
}
