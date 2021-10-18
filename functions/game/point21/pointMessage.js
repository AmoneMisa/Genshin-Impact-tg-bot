const getPoints = require('./getPoints');

module.exports = function (gameSession) {
    let str = "Игра в 21 очко.\n\n";

    for (let [playerId, player] of Object.entries(gameSession.pointPlayers)) {
        let member = gameSession.members[playerId];
        str += `${playerId === "bot" ? "Всемогущий" : member.userChatData.user.first_name}: `;
        let points = getPoints(player);
        str += player.cards.map(card => `${card}`).join(', ') + "; ";
        str += `Всего очков: ${points}\n`;
    }

    return str;
};