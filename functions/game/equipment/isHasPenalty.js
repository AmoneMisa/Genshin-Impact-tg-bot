export default function hasTooHighLevelEquipment(session) {
    if (!session?.game?.equipmentStats || !session?.game?.stats) {
        return false;
    }

    return Object.values(session.game.equipmentStats).some(slot => {
        if (!slot) return false;
        return session.game.stats.lvl < slot.minLvl;
    });
}
