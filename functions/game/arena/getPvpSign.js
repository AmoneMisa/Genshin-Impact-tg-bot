import getSession from "../../getters/getSession.js";

/**
 * Получает эффекты "Медали арены" для игрока
 * @param {Number} chatId - ID чата
 * @param {Number} userId - ID игрока
 */
export default async function(chatId, userId) {
    const session = await getSession(chatId, userId);

    if (
        !session?.game?.inventory?.arena ||
        !session.game.inventory.arena.items[1]
    ) {
        throw new Error(
            `Ошибка при попытке получить данные о 'Медали арены' у пользователя: ${userId}`
        );
    }

    const medal = session.game.inventory.arena.items[1];

    const increasePvpDamage = medal.effects.find(
        stat => stat.name === "increasePvpDamage"
    );
    const decreaseIncomingPvpDamage = medal.effects.find(
        stat => stat.name === "decreaseIncomingPvpDamage"
    );

    return { increasePvpDamage, decreaseIncomingPvpDamage };
}
