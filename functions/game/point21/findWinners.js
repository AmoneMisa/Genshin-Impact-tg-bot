const getPoints = require('./getPoints');

module.exports = function (gameSession) {
    let maxPoints = 0;
    let members = gameSession.members;
    let winners = [];

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

        if (diffGold !== 0) {
            members[id].game.inventory.gold = Math.round(members[id].game.inventory.gold + diffGold);
        }

        winners.push({
            name,
            bet,
            points,
            diffGold,
            isWining
        })
    }

    return winners;
};