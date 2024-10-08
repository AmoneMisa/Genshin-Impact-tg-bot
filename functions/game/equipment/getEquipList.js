export default function (session, minGrade) {
    let list = [];

    if (!session.game.inventory) {
        console.error(session.game);
        throw new Error(`Error while try get inventory: ${session.userChatData.user.id}`);
    }

    if (!session.game.inventory.equipment || !session.game.inventory.equipment.items.length) {
        console.error(session.game.inventory);
        throw new Error(`Error while try get equipment: ${session.userChatData.user.id}`);
    }

    if (minGrade) {
        list = session.game.inventory.equipment.items.filter((item) => getItemGradePower(item.grade) > getItemGradePower(minGrade));
    } else {
        list = session.game.inventory.equipment.items;
    }

    return list;
}

function getItemGradePower(grade) {
    const allGrades = ["noGrade", "D", "C", "B", "A", "S", "SS", "SSS"];
    return allGrades.indexOf(grade)
}