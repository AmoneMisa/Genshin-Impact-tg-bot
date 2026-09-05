import getPoints from "./getPoints.js";

/**
 * Формирует текстовое сообщение о состоянии игры "21 очко".
 * Chat.members после Mongo-миграции — массив subdocuments, а не объект по userId.
 */
export default function gameStatus(gameSession) {
    const players = gameSession.game.points.players;
    const members = Array.isArray(gameSession.members) ? gameSession.members : [];

    const lines = Object.entries(players).map(([playerId, player]) => {
        const member = members.find(item => String(item.userId) === String(playerId));
        const username = playerId === "bot"
            ? "Всемогущий"
            : `@${member?.userChatData?.user?.username || member?.userChatData?.user?.id || playerId}`;

        const points = getPoints(player);
        const cards = (player.usedItems || []).join(", ");

        return `${username}: ${cards}; Всего очков: ${points}`;
    });

    return `Игра в 21 очко.\n\n${lines.join("\n")}`;
}
