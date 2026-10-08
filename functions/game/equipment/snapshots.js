// An equipped item is copied into session.game.equipmentStats[slot]; these helpers tell which
// inventory item a snapshot belongs to. Catalog items are fixed, so two copies of one sword look
// the same - every instance therefore carries a `uid` (see catalog.js instantiate) and old items
// without one fall back to comparing their visible fields.
export function isSameSnapshot(equipped, item) {
    if (!equipped || !item) return false;
    if (equipped === item) return true;
    if (equipped.uid || item.uid) return equipped.uid === item.uid;

    return equipped.name === item.name
        && equipped.grade === item.grade
        && equipped.mainType === item.mainType
        && equipped.kind === item.kind
        && Number(equipped.cost || 0) === Number(item.cost || 0);
}

export function isActuallyEquipped(session, item) {
    if (!item?.slots?.length) return false;
    const equipmentStats = session?.game?.equipmentStats || {};
    return item.slots.some(slot => isSameSnapshot(equipmentStats[slot], item));
}

/** Copies the fields that change after equipping (enchant level, extra stats) into the live snapshot. */
export function syncEquippedSnapshot(session, item) {
    if (!isActuallyEquipped(session, item)) return;
    for (const slot of item.slots) {
        const equipped = session.game.equipmentStats[slot];
        if (!isSameSnapshot(equipped, item)) continue;
        equipped.enchant = item.enchant;
        equipped.stats = item.stats;
    }
}
