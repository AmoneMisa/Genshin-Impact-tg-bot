// What an equipped item adds on top of its fixed characteristics: the bonus of its enchant level and
// the full-set bonus of its armor set. getEquipStatByName.js folds both into the combat stats.
import equipmentTemplate from '../../../template/equipmentTemplate.js';
import { gradeIndex } from './catalog.js';

const config = () => equipmentTemplate.enchant;

/** Highest level an item can be enchanted to without any risk. */
export function safeEnchantLevel(item) {
    return item?.category === 'fullBody' ? config().safeFullBody : config().safe;
}

export function maxEnchantLevel() {
    return config().max;
}

export function getEnchantLevel(item) {
    return Math.max(0, Math.min(config().max, Math.floor(Number(item?.enchant) || 0)));
}

/** Share of an item's base power / defence its enchant level adds (levels above the safe one count double). */
export function enchantFraction(level, safe = config().safe) {
    let fraction = 0;
    for (let step = 1; step <= level; step++) fraction += step <= safe ? config().step : config().stepAbove;
    return fraction;
}

/** Extra stats an item gets from its enchant level: weapons gain power, everything else defence. */
export function enchantExtras(item) {
    const level = getEnchantLevel(item);
    if (!level) return {};
    const fraction = enchantFraction(level, safeEnchantLevel(item));
    const stat = item.mainType === 'weapon' ? 'power' : 'defence';
    const base = Number(item.characteristics?.[stat]) || 0;
    return base ? {[stat]: base * fraction} : {};
}

/** True for stats stored as a ready-to-multiply factor around 1 (maxHpMul, incomingDamageModifier ...). */
export function isFactorStat(name) {
    return name.endsWith('Mul') || name === 'incomingDamageModifier';
}

/** The full-set bonus of an armor type at a grade: the real set's bonus converted to game stats (no-grade armor has none). */
export function setBonusValues(gradeName, armorType) {
    const index = gradeIndex(gradeName);
    const set = equipmentTemplate.lineage?.armor?.[armorType]?.[index];
    return set ? {...set.bonus} : {};
}

/** Items counted once: a two-slot piece sits in `equipmentStats` under each slot it fills. */
export function uniqueEquipped(equipmentStats) {
    const seen = new Set();
    const items = [];
    const now = Date.now();
    for (const slot of Object.values(equipmentStats || {})) {
        if (!slot) continue;
        // A rented epic item stops working the moment its time is up.
        if (slot.timed && Number(slot.expiresAt) <= now) continue;
        if (Array.isArray(slot.slots)) {
            const key = `${slot.kind}|${[...slot.slots].sort().join(',')}`;
            if (seen.has(key)) continue;
            seen.add(key);
        }
        items.push(slot);
    }
    return items;
}

/** Pieces of each armor set that are worn, and whether the set is complete. */
export function activeSets(equipmentStats) {
    const sets = new Map();
    for (const item of uniqueEquipped(equipmentStats)) {
        if (item.mainType !== 'armor' || !item.setId) continue;
        if (!sets.has(item.setId)) sets.set(item.setId, {setId: item.setId, name: item.setName, grade: item.grade, type: item.kind, parts: new Set()});
        sets.get(item.setId).parts.add(item.category);
    }
    return [...sets.values()].map(set => {
        const parts = set.parts;
        const body = parts.has('fullBody') || (parts.has('body') && parts.has('greaves'));
        const complete = parts.has('helmet') && parts.has('gloves') && parts.has('boots') && body;
        return {
            setId: set.setId, name: set.name, grade: set.grade, type: set.type,
            pieces: parts.size, complete,
            bonus: complete ? setBonusValues(set.grade, set.type) : {}
        };
    });
}
