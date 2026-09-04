import getPoints from "./getPoints.js";

/**
 * Формирует текстовое сообщение о состоянии игры "21 очко"
 * @param {Object} gameSession - объект игровой сессии
 * @returns {string}
 */
export default function gameStatus(gameSession) {
    const players = gameSession.game.points.players;
    const members = gameSession.members;

    const lines = Object.entries(players).map(([playerId, player]) => {
        const member = members[playerId];
        const username =
            playerId === "bot"
                ? "Всемогущий"
                : `@${member?.userChatData?.user?.username || member?.userChatData?.user?.id || playerId}`;

        const points = getPoints(player);
        const cards = player.usedItems.join(", ");

        return `${username}: ${cards}; Всего очков: ${points}`;
    });

    return `Игра в 21 очко.\n\n${lines.join("\n")}`;
}
