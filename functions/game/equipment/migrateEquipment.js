// Items created before the Lineage 2 catalog had random stats, quality and durability and the grades
// SS / SSS. They are turned into the catalog item of the same grade, type and slot (SS -> S80,
// SSS -> S84) once, when the player's session is loaded; the forge level becomes the enchant level.
import { getCatalog, gradeInfo, instantiate } from './catalog.js';
import { MAX_LEGACY_FORGE_LEVEL } from './legacy.js';

export const EQUIPMENT_VERSION = 2;
const GRADE_RENAME = {SS: 'S80', SSS: 'S84'};

export function isLegacyItem(item) {
    return Boolean(item) && typeof item === 'object' && (item.version || 1) < EQUIPMENT_VERSION;
}

function legacySameItem(equipped, item) {
    return equipped.name === item.name
        && equipped.grade === item.grade
        && equipped.mainType === item.mainType
        && equipped.kind === item.kind
        && Number(equipped.cost || 0) === Number(item.cost || 0);
}

// Lineage 2 has no "medium" armor, and light / robe armor is one piece for chest and legs.
function legacyArmorTarget(item) {
    const kind = item.kind === 'medium' ? 'light' : item.kind;
    let category = item.category;
    if (kind === 'heavy' && category === 'fullBody') category = 'body';
    if (kind !== 'heavy' && (category === 'body' || category === 'greaves')) category = 'fullBody';
    return {kind, category};
}

function findDefinition(item, grade) {
    const catalog = getCatalog();
    const armor = item.mainType === 'armor' ? legacyArmorTarget(item) : null;
    return catalog.find(entry => !entry.epic && !entry.custom && entry.grade === grade && entry.mainType === item.mainType
            && entry.kind === (armor ? armor.kind : item.kind) && (!armor || entry.category === armor.category))
        || catalog.find(entry => !entry.epic && !entry.custom && entry.grade === grade && entry.mainType === item.mainType
            && Array.isArray(item.slots) && entry.slots.join() === item.slots.join())
        || null;
}

/** The catalog item replacing a legacy one, or null when nothing in the catalog fits it. */
export function migrateItem(item) {
    if (!isLegacyItem(item)) return item;
    const grade = GRADE_RENAME[item.grade] || (gradeInfo(item.grade) ? item.grade : 'noGrade');
    const definition = findDefinition(item, grade);
    if (!definition) return null;

    const enchant = Math.max(0, Math.min(MAX_LEGACY_FORGE_LEVEL, Math.floor(Number(item.forgeLevel) || 0)));
    const migrated = instantiate(definition, enchant);
    migrated.isUsed = Boolean(item.isUsed);
    // Rings and earrings remember which side they were worn on.
    if (migrated.pairSlots && Array.isArray(item.slots) && item.slots.length === 1) migrated.slots = [...item.slots];
    return migrated;
}

/** Migrates the inventory, the worn-item snapshots and a pending gacha item. Returns true if anything changed. */
export function migrateSessionEquipment(session) {
    const game = session?.game;
    if (!game) return false;
    let changed = false;

    const items = game.inventory?.equipment?.items;
    const replacements = new Map();
    if (Array.isArray(items)) {
        for (let index = items.length - 1; index >= 0; index--) {
            const item = items[index];
            if (!isLegacyItem(item)) continue;
            const migrated = migrateItem(item);
            changed = true;
            if (migrated) {
                replacements.set(item, migrated);
                items[index] = migrated;
            } else {
                items.splice(index, 1);
            }
        }
    }

    for (const [slotName, snapshot] of Object.entries(game.equipmentStats || {})) {
        if (!isLegacyItem(snapshot)) continue;
        changed = true;
        const owner = [...replacements.entries()].find(([old, fresh]) => fresh.isUsed && legacySameItem(snapshot, old));
        if (owner && owner[1].slots.includes(slotName)) {
            game.equipmentStats[slotName] = {...owner[1], minLvl: gradeInfo(owner[1].grade).lvl.from, isFilled: true};
        } else {
            game.equipmentStats[slotName] = null;
        }
    }

    // A worn item is only worn if its snapshot survived.
    if (changed && Array.isArray(items)) {
        for (const item of items) {
            if (item.isUsed && !item.slots.some(slot => game.equipmentStats?.[slot]?.uid === item.uid)) item.isUsed = false;
        }
    }

    // Two old pieces can turn into items that want the same slot (chest + legs became one full-body piece).
    if (changed && Array.isArray(items)) {
        const taken = new Set();
        for (const item of items) {
            if (!item.isUsed) continue;
            if (item.slots.some(slot => taken.has(slot))) {
                item.isUsed = false;
                for (const slot of item.slots) if (game.equipmentStats?.[slot]?.uid === item.uid) game.equipmentStats[slot] = null;
            } else {
                item.slots.forEach(slot => taken.add(slot));
            }
        }
        // A worn piece fills every slot it covers (a full-body piece both chest and legs).
        for (const item of items) {
            if (!item.isUsed) continue;
            for (const slot of item.slots) {
                game.equipmentStats[slot] = {...item, minLvl: gradeInfo(item.grade).lvl.from, isFilled: true};
            }
        }
    }

    if (isLegacyItem(game.gachaTempItem)) {
        game.gachaTempItem = migrateItem(game.gachaTempItem);
        changed = true;
    }

    return changed;
}
