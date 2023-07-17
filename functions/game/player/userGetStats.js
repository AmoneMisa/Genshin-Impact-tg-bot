const getPlayerStatsMessage = require("./getPlayerStatsMessage");
const getInventoryMessage = require("./getInventoryMessage");
const getUserName = require('../../getters/getUserName');

module.exports = function (session) {
    let game = session.game;
    let baseStats = game.stats;
    let inventory = game.inventory;

    let message = `Статистика @${getUserName(session, "nickname")}:\n`;
    message += `Уровень: ${baseStats.lvl}\n`;
    message += `Текущее к-во опыта: ${baseStats.currentExp}\n`;
    message += `Требуемое к-во опыта до следующего уровня: ${baseStats.needExp}\n`;

    message += getPlayerStatsMessage(session);
    message += getInventoryMessage(inventory);

    if (session.swordImmune) {
        message += "Иммунитет к выпадению отрицательного числа при увеличении меча.\n"
    }

    return message;
};