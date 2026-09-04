import calcGearScore from '../player/calcGearScore.js';

/**
 * Рассчитывает изменение рейтинга синхронно.
 * Рейтинги можно передать последним аргументом, чтобы вызывающий код сам
 * выполнил Mongo I/O до расчёта и не получил Promise вместо числа.
 */
export default function (attacker, defender, arenaType, chatId, isBot = false, ratings = null) {
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

    if (ratings && Number.isFinite(Number(ratings.attacker)) && Number.isFinite(Number(ratings.defender))) {
        const attackerRating = Math.max(1, Number(ratings.attacker));
        const defenderRating = Number(ratings.defender);
        const ratingDiffPercent = ((defenderRating - attackerRating) / attackerRating) * 100;

        if (ratingDiffPercent >= 12) {
            winnerPoints += 17;
        } else if (ratingDiffPercent >= 3) {
            winnerPoints += 5;
        } else if (ratingDiffPercent < 0) {
            winnerPoints -= 5;
        }
    }

    return Math.min(maxPoints, Math.max(minPoints, winnerPoints));
}
