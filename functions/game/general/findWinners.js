const getPoints = require('../point21/getPoints');

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
        for (let player of Object.values(players)) {
            if (player.points > maxPoints) {
                maxPoints = player.points;
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

function getName(id, members) {
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
            let cards = player.usedItems;
            let name = getName(id, members);
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
                cards,
                isWining
            })
        }
    }

    if (gameName === "elements") {
        for (let player of Object.values(players)) {
            let name = getName(player.id, members);
            let bet = getBet(player.id, player);
            let points = player.points;
            let elements = player.usedItems;

            if (points === maxPoints) {
                isWining = true;
                diffGold = bet * 1.75;
            } else {
                isWining = false;
                diffGold = -bet;
            }

            if (diffGold !== 0) {
                members[player.id].game.inventory.gold = Math.round(members[player.id].game.inventory.gold + diffGold);
            }

            winners.push({
                name,
                bet,
                points,
                diffGold,
                isWining,
                elements
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