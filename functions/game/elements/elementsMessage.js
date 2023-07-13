const calcScore = require('./calcScore');

module.exports = function (gameSession) {
    let str = "Игра в элементы.\n\n";
    let scores = calcScore(gameSession);

    for (let [playerId, score] of Object.entries(scores)) {
        let member = gameSession.members[playerId];
        let player = gameSession.elements.players[playerId];

        str += `${playerId === "bot" ? "Всемогущий" : `@${member.userChatData.user.username || member.userChatData.user.id}`}: `;
        str += player.game.elements.map(element => `${element}`).join(', ') + "; ";
        str += `Всего очков: ${score}\n`;
    }

    return str;
};