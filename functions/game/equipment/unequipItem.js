export default function unequipItem(session, item) {
    if (!item?.slots || !Array.isArray(item.slots)) {
        console.warn("Предмет не имеет слотов:", item);
        return;
    }

    if (!session?.game?.equipmentStats) {
        console.warn("У игрока нет equipmentStats:", session?.game);
        return;
    }

    item.isUsed = false;

    for (const slot of item.slots) {
        session.game.equipmentStats[slot] = null;
    }
}
