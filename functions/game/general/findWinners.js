import getPoints from '../point21/getPoints.js';

function calcMaxPoints(players, gameName) {
    let maxPoints = 0;

    if (gameName === "points") {
        for (const player of Object.values(players)) {
            const points = getPoints(player) || 0;
            if (maxPoints < points && points <= 21) maxPoints = points;
        }
    }

    if (gameName === "elements") {
        for (const player of Object.values(players)) {
            if ((player.points || 0) > maxPoints) maxPoints = player.points;
        }
    }

    return maxPoints;
}

function getBet(id, player) {
    return String(id) === "bot" ? 0 : Number(player.bet) || 0;
}

function findMember(members, id) {
    if (!Array.isArray(members)) return null;
    return members.find(member => String(member.userId) === String(id)) || null;
}

function getName(id, members) {
    if (String(id) === "bot") return "Всемогущий";
    const member = findMember(members, id);
    const user = member?.userChatData?.user || {};
    return user.username || user.first_name || user.id || id;
}

function applyGoldDelta(members, id, diffGold) {
    if (!diffGold || String(id) === "bot") return;
    const member = findMember(members, id);
    if (!member?.game?.inventory) return;
    const current = Number(member.game.inventory.gold) || 0;
    member.game.inventory.gold = Math.round(current + diffGold);
}

function getWinners(players, maxPoints, gameName, members) {
    const winners = [];

    if (gameName === "points") {
        for (const [id, player] of Object.entries(players)) {
            const points = getPoints(player) || 0;
            const cards = player.usedItems || [];
            const name = getName(id, members);
            const bet = getBet(id, player);
            let isWining = false;
            let diffGold = -bet;

            if (points === 21) {
                isWining = true;
                diffGold = bet * 3;
            } else if (points === maxPoints && points <= 21) {
                isWining = true;
                diffGold = bet * 1.8;
            }

            applyGoldDelta(members, id, diffGold);
            winners.push({ name, bet, points, diffGold, cards, isWining });
        }
    }

    if (gameName === "elements") {
        for (const [key, player] of Object.entries(players)) {
            const id = player.id ?? key;
            const name = getName(id, members);
            const bet = getBet(id, player);
            const points = Number(player.points) || 0;
            const elements = player.usedItems || [];
            const isWining = points === maxPoints;
            const diffGold = isWining ? bet * 1.75 : -bet;

            applyGoldDelta(members, id, diffGold);
            winners.push({ name, bet, points, diffGold, isWining, elements });
        }
    }

    return winners;
}

export default function (gameSession, gameName) {
    const members = gameSession.members;
    const players = gameSession.game[gameName].players;
    const maxPoints = calcMaxPoints(players, gameName);
    return getWinners(players, maxPoints, gameName, members);
}
