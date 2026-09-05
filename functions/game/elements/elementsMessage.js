import getUserName from "../../getters/getUserName.js";

export default async function formatElementsGame(gameSession) {
    let str = "Игра в элементы.\n\n";
    const players = gameSession?.game?.elements?.players || {};
    const members = Array.isArray(gameSession?.members) ? gameSession.members : [];

    for (const [playerId, player] of Object.entries(players)) {
        const member = members.find(item => String(item.userId) === String(player.id ?? playerId));
        const username = playerId === "bot" || player.id === "bot"
            ? "Всемогущий"
            : `@${await getUserName(member?.userId ?? playerId, "nickname") || member?.userChatData?.user?.id || playerId}`;

        const usedItems = Array.isArray(player.usedItems) && player.usedItems.length
            ? player.usedItems.join(", ")
            : "нет стихий";

        str += `${username}: ${usedItems}; Всего очков: ${player.points ?? 0}\n`;
    }

    return str;
}
