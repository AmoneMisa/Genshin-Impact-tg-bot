import calcGearScore from '../player/calcGearScore.js';
import getPlayerRating from './getPlayerRating.js';

export default function (attacker, defender, arenaType, chatId, isBot) {
    let defenderLvl = isBot ? defender.stats.lvl : defender.game.stats.lvl;
    let defenderStats = isBot ? defender : defender.game;
    let winnerPoints = 10;
    let maxPoints = 30;

    let lvlDiff = defenderLvl - attacker.game.stats.lvl;

    if (lvlDiff >= 10) {
        winnerPoints += 6;
    } else if (lvlDiff < 0) {
        winnerPoints -= 4;
    }

    let attackerGearScore = calcGearScore(attacker.game);
    let defenderGearScore = calcGearScore(defenderStats);
    if (defenderGearScore / attackerGearScore * 100 - 100 >= 20) {
        winnerPoints += 15;
    }

    let [attackerRating] = getPlayerRating(attacker.userChatData.user.id, arenaType, chatId);
    let defenderRating = isBot ? defender.rating : getPlayerRating(defender.userChatData.user.id, arenaType, chatId)[0];

    if (defenderRating >= attackerRating) {
        winnerPoints -= 5;
    } else if (defenderRating / attackerRating * 100 - 100 >= 12) {
        winnerPoints += 17;
    } else if (defenderRating / attackerRating * 100 - 100 >= 3) {
        winnerPoints += 5;
    }

    return Math.max(maxPoints, winnerPoints, 5);
}