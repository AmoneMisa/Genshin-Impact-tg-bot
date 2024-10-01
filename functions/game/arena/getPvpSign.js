export default function (session) {
    if (!session.game.inventory || !session.game.inventory.arena || !session.game.inventory.arena.items[1]) {
        throw new Error(`Ошибка при попытке получить данные о 'Медали арены' у пользователя: ${session.userChatData.user.id}`);
    }

    let increasePvpDamage = session.game.inventory.arena.items[1].effects.find(stat => stat.name === "increasePvpDamage");
    let decreaseIncomingPvpDamage = session.game.inventory.arena.items[1].effects.find(stat => stat.name === "decreaseIncomingPvpDamage");
    return {increasePvpDamage, decreaseIncomingPvpDamage};
};