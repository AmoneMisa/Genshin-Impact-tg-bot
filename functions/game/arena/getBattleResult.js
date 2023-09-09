const playerDamagePlayer = require("./playerDamagePlayer");

// 0 - выигрыш атакующего
// 1 - проигрыш атакующего
// 2 - ничья атакующего

module.exports = function (attacker, defender) {
    let [attackerHp, defenderHp] = playerDamagePlayer(attacker, defender);

    //Если хп защитника 0, мы выиграли, иначе
    // Если хп атакующего 0, мы проиграли, иначе
    // если хп и у того, и у того НЕ равно 0 - ничья
    return defenderHp === 0 ? 0 : (attackerHp === 0 ? 1 : 2);
};