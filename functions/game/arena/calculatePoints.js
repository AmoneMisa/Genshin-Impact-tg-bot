import calcGearScore from '../player/calcGearScore.js';
import getPlayerRating from './getPlayerRating.js';

export default async function (attacker, defender, arenaType, chatId, isBot = false) {
    const defenderLvl = Number(isBot ? defender.stats.lvl : defender.game.stats.lvl) || 1;
    const defenderStats = isBot ? defender : defender.game;
    let winnerPoints = 10;
    const minPoints = 5;
    const maxPoints = 30;

    const attackerLvl = Number(attacker.game.stats.lvl) || 1;
    const lvlDiff = defenderLvl - attackerLvl;
    if (lvlDiff >= 10) {
        winnerPoints += 6;
    } else if (lvlDiff < 0) {
        winnerPoints -= 4;
    }

    const attackerGearScore = Math.max(1, Number(calcGearScore(attacker.game)) || 1);
    const defenderGearScore = Math.max(1, Number(calcGearScore(defenderStats)) || 1);
    if ((defenderGearScore / attackerGearScore * 100) - 100 >= 20) {
        winnerPoints += 15;
    }

    const [attackerRating] = await getPlayerRating(attacker.userChatData.user.id, arenaType, chatId);
    const defenderRating = isBot
        ? Number(defender.rating) || 1000
        : (await getPlayerRating(defender.userChatData.user.id, arenaType, chatId))[0];

    const ratingDiffPercent = ((defenderRating - attackerRating) / Math.max(1, attackerRating)) * 100;
    if (ratingDiffPercent >= 12) {
        winnerPoints += 17;
    } else if (ratingDiffPercent >= 3) {
        winnerPoints += 5;
    } else if (ratingDiffPercent < 0) {
        winnerPoints -= 5;
    }

    return Math.min(maxPoints, Math.max(minPoints, winnerPoints));
}
