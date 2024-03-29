const getPoints = require('./getPoints');

module.exports = function (gameSession) {
    let str = "Игра в 21 очко.\n\n";

    for (let [playerId, player] of Object.entries(gameSession.game.points.players)) {
        let member = gameSession.members[playerId];
        str += `${playerId === "bot" ? "Всемогущий" : `@${member.userChatData.user.username || member.userChatData.user.id}`}: `;
        let points = getPoints(player);
        str += player.usedItems.map(card => `${card}`).join(', ') + "; ";
        str += `Всего очков: ${points}\n`;
    }

    return str;
};