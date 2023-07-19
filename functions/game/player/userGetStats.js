const getPlayerStatsMessage = require("./getPlayerGameClassMessage");
const getUserName = require('../../getters/getUserName');
const getEmoji = require('../../getters/getEmoji');

module.exports = function (session) {
    let game = session.game;
    let baseStats = game.stats;
    let gameClass = game.gameClass;
    let playerEffects = game.effects;

    let message = `Статистика @${getUserName(session, "nickname")}:\n`;
    message += `${getEmoji("lvl")} Уровень: ${baseStats.lvl}\n`;
    message += `${getEmoji("currentExp")} Текущее к-во опыта: ${baseStats.currentExp}\n`;
    message += `${getEmoji("needExp")} Требуемое к-во опыта до следующего уровня: ${baseStats.needExp}\n\n`;

    message += getPlayerStatsMessage(gameClass, baseStats, playerEffects);

    if (session.swordImmune) {
        message += "Иммунитет к выпадению отрицательного числа при увеличении меча.\n"
    }

    return message;
};