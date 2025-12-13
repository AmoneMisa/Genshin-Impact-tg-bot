export default function getEquipmentByGrade(session, minGrade) {
    if (!session?.game?.inventory?.equipment?.items) {
        console.error("Инвентарь отсутствует:", session?.game);
        return [];
    }

    const items = session.game.inventory.equipment.items;

    if (!items.length) {
        console.error("Нет предметов в инвентаре:", session.game.inventory);
        return [];
    }

    if (!minGrade) {
        return items;
    }

    return items.filter(item => getItemGradePower(item.grade) > getItemGradePower(minGrade));
}

function getItemGradePower(grade) {
    const allGrades = ["noGrade", "D", "C", "B", "A", "S", "SS", "SSS"];
    const index = allGrades.indexOf(grade);
    if (index === -1) {
        console.warn(`Неизвестный грейд: ${grade}`);
        return 0; // считаем как самый низкий
    }
    return index;
}
