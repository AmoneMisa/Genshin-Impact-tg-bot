module.exports = function (gameSession) {
    let str = "Игра в элементы.\n\n";
    let players = gameSession.game.elements.players;

    for (let player of Object.values(players)) {
        let member = gameSession.members[player.id];

        str += `${player.id === "bot" ? "Всемогущий" : `@${member.userChatData.user.username || member.userChatData.user.id}`}: `;
        str += player.usedItems.map(element => `${element}`).join(', ') + "; ";
        str += `Всего очков: ${player.points}\n`;
    }

    return str;
};