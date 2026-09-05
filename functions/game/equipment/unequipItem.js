function isSameEquipmentSnapshot(equipped, item) {
    if (!equipped || !item) return false;
    if (equipped === item) return true;

    return equipped.name === item.name
        && equipped.grade === item.grade
        && equipped.mainType === item.mainType
        && equipped.kind === item.kind
        && Number(equipped.cost || 0) === Number(item.cost || 0);
}

export default function unequipItem(session, item) {
    if (!item?.slots || !Array.isArray(item.slots)) {
        console.warn("Предмет не имеет слотов:", item);
        return 1;
    }

    if (!session?.game?.equipmentStats) {
        console.warn("У игрока нет equipmentStats:", session?.game);
        return 1;
    }

    item.isUsed = false;

    // Do not wipe a slot that has already been occupied by another item. This
    // protects against old stale isUsed flags left by the legacy inventory UI.
    for (const slot of item.slots) {
        const equipped = session.game.equipmentStats[slot];
        if (!equipped || isSameEquipmentSnapshot(equipped, item)) {
            session.game.equipmentStats[slot] = null;
        }
    }

    return 0;
}
