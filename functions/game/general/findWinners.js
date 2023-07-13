const getPoints = require('../point21/getPoints');
const calcScore = require('../elements/calcScore');

function calcMaxPoints(players, gameName) {
    let maxPoints = 0;

    if (gameName === "points") {
        for (let player of Object.values(players)) {
            let points = getPoints(player);

            if (maxPoints < points && points <= 21) {
                maxPoints = points;
            }
        }
    }

    if (gameName === "elements") {
        let pointsObject = calcScore(players);

        for (let points of Object.values(pointsObject)) {
            if (points > maxPoints) {
                maxPoints = points;
            }
        }
    }

    return maxPoints;
}

function getBet(id, player) {
    let bet;

    if (id === "bot") {
        bet = 0;
    } else {
        bet = player.bet;
    }

    return bet;
}

function getName(id, player, members) {
    let name;

    if (id === "bot") {
        name = "Всемогущий"
    } else {
        name = members[id].userChatData.user.username;
    }

    return name;
}

function getWinners(players, maxPoints, gameName, members) {
    let isWining;
    let diffGold;
    let winners = [];

    if (gameName === "points") {
        for (let [id, player] of Object.entries(players)) {
            let points = getPoints(player);

            let name = getName(id, player, members);
            let bet = getBet(id, player);

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
    }

    if (gameName === "elements") {
        let scores = calcScore(players);
        for (let [id, score] of Object.entries(scores)) {
            let name = getName(id, players[id], members);
            let bet = getBet(id, players[id]);

            if (score >= maxPoints) {
                isWining = true;
                diffGold = bet * 1.75;
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
                score,
                diffGold,
                isWining
            })
        }
    }

    return winners;
}


module.exports = function (gameSession, gameName) {
    let members = gameSession.members;
    let players = gameSession.game[gameName].players;
    let maxPoints = calcMaxPoints(players, gameName);

    return getWinners(players, maxPoints, gameName, members);
};