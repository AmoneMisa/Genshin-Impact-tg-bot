// Timed (rented) epic equipment sold in the Donate shop: a normal catalog item with `timed` and an
// `expiresAt` timestamp. It works like any other item while it lasts, can be enchanted, but cannot
// be sold, crystallized or put on the auction. When the time is up it is unequipped and removed.
import { findCatalogItem, instantiate } from './catalog.js';
import { isActuallyEquipped } from './snapshots.js';
import unequipItem from './unequipItem.js';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const TIMED_EPIC_DAYS = 7;

export const isTimedItem = item => Boolean(item?.timed) && Number(item.expiresAt) > 0;
export const isExpiredItem = (item, now = Date.now()) => isTimedItem(item) && Number(item.expiresAt) <= now;

/** Days left, rounded up (at least 1 while the item is alive). */
export const daysLeft = (item, now = Date.now()) => Math.max(1, Math.ceil((Number(item.expiresAt) - now) / DAY_MS));

function items(session) {
    return session?.game?.inventory?.equipment?.items;
}

/** Takes expired timed items off the character and out of the inventory; returns their names. */
export function expireTimedItems(session, now = Date.now()) {
    const list = items(session);
    const removed = [];
    if (Array.isArray(list)) {
        for (const item of [...list]) {
            if (!isExpiredItem(item, now)) continue;
            if (item.isUsed || isActuallyEquipped(session, item)) unequipItem(session, item);
            list.splice(list.indexOf(item), 1);
            removed.push(item.name);
        }
    }
    // A snapshot of an expired item that somehow stayed in a slot gives no stats either.
    const slots = session?.game?.equipmentStats;
    if (slots) {
        for (const [slot, snapshot] of Object.entries(slots)) {
            if (isExpiredItem(snapshot, now)) delete slots[slot];
        }
    }
    return removed;
}

/**
 * Rents a catalog item for `days`: a new copy, or +days on the copy the player already has.
 * Returns {item, extended} or null when the catalog has no such item.
 */
export function grantTimedItem(session, catalogId, days = TIMED_EPIC_DAYS, now = Date.now()) {
    const definition = findCatalogItem(catalogId);
    const list = items(session);
    if (!definition || !Array.isArray(list)) return null;

    const own = list.find(item => isTimedItem(item) && item.id === definition.id);
    if (own) {
        own.expiresAt = Math.max(Number(own.expiresAt), now) + days * DAY_MS;
        return {item: own, extended: true};
    }
    const item = instantiate(definition);
    item.timed = true;
    item.expiresAt = now + days * DAY_MS;
    list.push(item);
    return {item, extended: false};
}
