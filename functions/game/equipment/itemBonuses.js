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
// Masterwork (MW) is a class of Lineage II items (template/masterworkItems.js, from l2j.ru): the lists name the stats
// that each MW item improves. A craft of such an item can come out as the masterwork one (chance: the base chance and the
// forge). The masterwork copy improves exactly the stats its l2j entry names, by an amount fixed per item (from its id).
// It is shown with a yellow name and the postfix below.
import masterworkTemplate from '../../../template/masterworkItems.js';

export const MASTERWORK_POSTFIX = ' - MW';

/** True when the item (a catalog item or a copy of it) belongs to the masterwork class of Lineage II. */
export function isMasterworkClass(item) {
    return Boolean(item?.name) && Object.hasOwn(masterworkTemplate, item.name);
}

/** The name shown to the player: a masterwork item carries the postfix. */
export function masterworkName(item) {
    const name = item?.name || '';
    return item?.masterwork && name ? `${name}${MASTERWORK_POSTFIX}` : name;
}

function itemSeed(item) {
    let hash = 2166136261;
    for (const char of String(item?.id ?? item?.name ?? '')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    return hash;
}

/** {main, other, stats}: share added to the power/defence, share added to the other listed stats, the stats of the item. */
export function masterworkProfile(item) {
    const seed = itemSeed(item);
    const mainStat = item?.mainType === 'weapon' ? 'power' : 'defence';
    const listed = masterworkTemplate[item?.name] || [];
    return {
        main: 0.06 + (seed % 9) / 100,
        other: 0.15 + ((seed >>> 4) % 6) / 20,
        // a class item without a named stat still gets its main stat improved
        stats: listed.length ? listed : [mainStat],
    };
}

/** What masterwork adds to the characteristics of an item (nothing for an ordinary one). */
export function masterworkExtras(item) {
    if (!item?.masterwork) return {};
    const profile = masterworkProfile(item);
    const extras = {};
    for (const name of profile.stats) {
        const raw = Number(item.characteristics?.[name]);
        if (!Number.isFinite(raw)) continue;
        if (name === 'power' || name === 'defence') extras[name] = raw * profile.main;
        else if (isFactorStat(name)) extras[name] = (raw - 1) * profile.other;
        else if (raw > 0) extras[name] = raw * profile.other;
    }
    // when none of the named stats exists on this copy, the main stat carries the bonus
    if (!Object.keys(extras).length) {
        const stat = item.mainType === 'weapon' ? 'power' : 'defence';
        const base = Number(item.characteristics?.[stat]);
        if (Number.isFinite(base) && base > 0) extras[stat] = base * profile.main;
    }
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
