const getPoints = require('./getPoints');

module.exports = function (gameSession) {
    let str = "Список игроков:\n\n";
    let members = gameSession.members;
    let maxPoints = 0;

    for (let player of Object.values(gameSession.pointPlayers)) {
        let points = getPoints(player);

        if (maxPoints < points && points <= 21) {
            maxPoints = points;
        }
    }

    for (let [id, player] of Object.entries(gameSession.pointPlayers)) {
        let points = getPoints(player);

        let bet;
        let name;

        if (id === "bot") {
            bet = 0;
            name = "Всемогущий"
        } else {
            bet = player.bet;
            name = members[id].userChatData.user.username;
        }

        let isWining;
        let diffGold;

        if (points === 21) {
            isWining = true;
            diffGold = bet * 3;
        } else if (points === maxPoints) {
            isWining = true;
            diffGold = bet * 1.8;
        } else {
            isWining = false;
            diffGold = -bet;
        }

        let goldStr = '';

        if (diffGold !== 0) {
            members[id].game.inventory.gold += diffGold;
            goldStr = `${diffGold} золота`;
        }

        str += `${name}: ${points} очка(-ов). `;

        if (isWining) {
            if (goldStr) {
                str += `Выигрыш: ${goldStr}`;
            } else {
                str += `Победитель!`;
            }
        } else {
            if (goldStr) {
                str += `Проигрыш: ${goldStr}`;
            } else {
                str += `Лууузер!`;
            }
        }

        str += '\n';
    }

    return str;
};