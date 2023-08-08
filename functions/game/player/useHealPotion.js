const getEquipStatByName = require("./getters/getEquipStatByName");
const getMaxHp = require("./getters/getMaxHp");
const getCurrentHp = require("./getters/getCurrentHp");

module.exports = function (session, potion) {
    let player = session.game.gameClass.stats;

    if (player.hp <= 0) {
        return 1;
    }

    if (getCurrentHp(session, session.game.gameClass) === getMaxHp(session, session.game.gameClass)) {
        return 2;
    }

    potion.count--;
    session.game.gameClass.stats.hp = Math.min(potion.power * getEquipStatByName(session, "healPowerPotionsMul", true), getMaxHp(session, session.game.gameClass));
    session.game.inventory.potions.find(_potion => _potion.bottleType === potion.bottleType && _potion.name === potion.name && _potion.power === potion.power).count = potion.count;
    return 0;
};