const playerDamagePlayer = require("./playerDamagePlayer");
const getMaxHp = require("../player/getters/getMaxHp");

// 0 - выигрыш атакующего
// 1 - проигрыш атакующего
// 2 - ничья

module.exports = function (attacker, defender, isBot = false) {
    let [attackerHp, defenderHp] = playerDamagePlayer(attacker, defender, isBot, false, 60, true);
    let defenderCurrentHpPercent;

    if (isBot) {
        defenderCurrentHpPercent = defenderHp / getMaxHp(defender, defender.gameClass) * 100;
    } else {
        defenderCurrentHpPercent = defenderHp / getMaxHp(defender, defender.game.gameClass) * 100;
    }
    // Если хп защитника 0, мы выиграли, иначе
    // Если хп атакующего 0, мы проиграли, иначе
    // если хп и у того, и у того НЕ равно 0 - ничья
    return [(defenderHp === 0 || defenderCurrentHpPercent <= 0.18) ? 0 : ((attackerHp === 0 || defenderCurrentHpPercent > 0.18) ? 1 : 2), defenderCurrentHpPercent];
};