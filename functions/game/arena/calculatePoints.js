const calcGearScore = require("../player/calcGearScore");
const getPlayerRating = require("./getPlayerRating");

module.exports = function (attacker, defender, arenaType, chatId) {
    let winnerPoints = 10;
    let maxPoints = 30;

    let lvlDiff = defender.game.stats.lvl - attacker.game.stats.lvl;

    if (lvlDiff >= 10) {
        winnerPoints += 6;
    } else if (lvlDiff < 0) {
        winnerPoints -= 4;
    }

    let attackerGearScore = calcGearScore(attacker.game);
    let defenderGearScore = calcGearScore(defender.game);
    if (defenderGearScore / attackerGearScore * 100 - 100 >= 20) {
        winnerPoints += 15;
    }

    let [attackerRating] = getPlayerRating(attacker.userChatData.user.id, arenaType, chatId);
    let [defenderRating] = getPlayerRating(defender.userChatData.user.id, arenaType, chatId);

    if (defenderRating >= attackerRating) {
        winnerPoints -= 5;
    } else if (defenderRating / attackerRating * 100 - 100 >= 12) {
        winnerPoints += 17;
    } else if (defenderRating / attackerRating * 100 - 100 >= 3) {
        winnerPoints += 5;
    }

    return Math.max(maxPoints, winnerPoints, 5);
}