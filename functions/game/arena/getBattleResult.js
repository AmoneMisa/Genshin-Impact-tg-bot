const playerDamagePlayer = require("./playerDamagePlayer");

module.exports = function (attacker, defender) {
    let attackerDamage = playerDamagePlayer(attacker, defender);
    let defenderDamage = playerDamagePlayer(defender, attacker);

};