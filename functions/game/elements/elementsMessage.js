import getUserName from "../../getters/getUserName.js";

export default async function formatElementsGame(gameSession) {
    let str = "Игра в элементы.\n\n";
    const players = gameSession?.game?.elements?.players || {};

    for (const player of Object.values(players)) {
        const member = gameSession.members[player.id];

        const username = player.id === "bot"
            ? "Всемогущий"
            : `@${await getUserName(member, "nickname") || "Неизвестный"}`;

        const usedItems = Array.isArray(player.usedItems)
            ? player.usedItems.join(", ")
            : "нет предметов";

        str += `${username}: ${usedItems}; Всего очков: ${player.points ?? 0}\n`;
    }

    return str;
}
