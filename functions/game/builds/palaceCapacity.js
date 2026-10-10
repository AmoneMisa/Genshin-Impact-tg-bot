// The palace's level sets how much a hero can carry: inventory slots and personal warehouse slots grow evenly
// from the level 1 values to the level 30 values. Clan warehouses have their own size (miniapp/itemTransfer.js).
export const PALACE_MAX_LEVEL = 30;
export const INVENTORY_SLOTS = Object.freeze({min: 80, max: 250});
export const WAREHOUSE_SLOTS = Object.freeze({min: 60, max: 500});

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function palaceLevel(session) {
    return Math.max(1, Math.min(PALACE_MAX_LEVEL, Math.floor(number(session?.game?.builds?.palace?.currentLvl, 1))));
}

function scaled({min, max}, level) {
    return Math.round(min + (max - min) * (level - 1) / (PALACE_MAX_LEVEL - 1));
}

export const inventoryCapacity = session => scaled(INVENTORY_SLOTS, palaceLevel(session));
export const warehouseCapacity = session => scaled(WAREHOUSE_SLOTS, palaceLevel(session));

/** Slots an inventory (or any stock of the same shape) takes: every item, potion stack and kind of material. Gold and the like take none. */
export function inventorySlotsUsed(inventory) {
    const equipment = Array.isArray(inventory?.equipment?.items) ? inventory.equipment.items.length : 0;
    const potions = (inventory?.potions?.items || []).filter(potion => number(potion?.count) > 0).length;
    const materials = Object.values(inventory?.materials || {}).filter(count => number(count) > 0).length;
    return equipment + potions + materials;
}

/** Whether the hero can take one more new item (a stack that already exists never needs a new slot). */
export function hasInventoryRoom(session, extra = 1) {
    return inventorySlotsUsed(session?.game?.inventory) + extra <= inventoryCapacity(session);
}

/** {used, capacity} of the hero's bag, for the screens. */
export function inventoryUsage(session) {
    return {used: inventorySlotsUsed(session?.game?.inventory), capacity: inventoryCapacity(session)};
}
