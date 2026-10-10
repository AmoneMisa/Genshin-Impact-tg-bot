// What an equipped item adds on top of its fixed characteristics: the bonus of its enchant level and
// the full-set bonus of its armor set. getEquipStatByName.js folds both into the combat stats.
import equipmentTemplate from '../../../template/equipmentTemplate.js';
import { gradeIndex, customSetBonus } from './catalog.js';

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

// ---- masterwork ----
// A masterwork (MW) item is the rare result of a craft. As in Lineage II every item has bonuses of its own: the
// strength of the main stat, how much of its other characteristics it improves and the one stat it adds are fixed per
// item (derived from its id), so two MW items never get the same bonus.
const MASTERWORK_EXTRA_POOL = Object.freeze({
    weapon: ['accuracy', 'criticalChance', 'evasion'],
    armor: ['evasion', 'accuracy'],
    shield: ['block', 'evasion'],
    jewelry: ['accuracy', 'evasion'],
});

function itemSeed(item) {
    let hash = 2166136261;
    for (const char of String(item?.id ?? item?.name ?? '')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    return hash;
}

/** The masterwork profile of an item: {main: share of the main stat, other: share of its other stats, extra: {stat, value}}. */
export function masterworkProfile(item) {
    const seed = itemSeed(item);
    const pool = MASTERWORK_EXTRA_POOL[item?.mainType] || MASTERWORK_EXTRA_POOL.armor;
    return {
        main: 0.06 + (seed % 9) / 100,
        other: 0.15 + ((seed >>> 4) % 6) / 20,
        extra: {stat: pool[(seed >>> 8) % pool.length], value: 2 + ((seed >>> 12) % 4)},
    };
}

/** What masterwork adds to the characteristics of an item (nothing for an ordinary one). */
export function masterworkExtras(item) {
    if (!item?.masterwork) return {};
    const profile = masterworkProfile(item);
    const mainStat = item.mainType === 'weapon' ? 'power' : 'defence';
    const extras = {};
    for (const [name, raw] of Object.entries(item.characteristics || {})) {
        const value = Number(raw);
        if (!Number.isFinite(value) || name === 'randomDamage') continue;
        if (name === mainStat) extras[name] = value * profile.main;
        else if (isFactorStat(name)) extras[name] = (value - 1) * profile.other;
        else if (value > 0) extras[name] = value * profile.other;
    }
    extras[profile.extra.stat] = (extras[profile.extra.stat] || 0) + profile.extra.value;
    return extras;
}

/** Everything an item adds on top of its fixed characteristics: enchant level and masterwork. */
export function itemExtras(item) {
    const result = {...enchantExtras(item)};
    for (const [name, extra] of Object.entries(masterworkExtras(item))) result[name] = (result[name] || 0) + extra;
    return result;
}

/** True for stats stored as a ready-to-multiply factor around 1 (maxHpMul, incomingDamageModifier ...). */
export function isFactorStat(name) {
    return name.endsWith('Mul') || name === 'incomingDamageModifier';
}

/** The full-set bonus of an armor type at a grade: the real set's bonus converted to game stats (no-grade armor has none). */
export function setBonusValues(gradeName, armorType, setId = null) {
    const custom = customSetBonus(setId);
    if (custom) return custom;
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
            bonus: complete ? setBonusValues(set.grade, set.type, set.setId) : {}
        };
    });
}
