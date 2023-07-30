const getPlayerGameClassMessage = require("./getPlayerGameClassMessage");
const getUserName = require('../../getters/getUserName');
const getEmoji = require('../../getters/getEmoji');
const getTime = require("../../getters/getTime");
const getStringRemainTime = require("../../getters/getStringRemainTime");

module.exports = function (session) {
    let game = session.game;
    let baseStats = game.stats;
    let gameClass = game.gameClass;
    let playerEffects = game.effects;

    let message = `Статистика @${getUserName(session, "nickname")}:\n`;
    message += `${getEmoji("lvl")} Уровень: ${baseStats.lvl}\n`;
    message += `${getEmoji("currentExp")} Текущее к-во опыта: ${baseStats.currentExp}\n`;
    message += `${getEmoji("needExp")} Требуемое к-во опыта до следующего уровня: ${baseStats.needExp}\n\n`;

    message += getPlayerGameClassMessage(gameClass, baseStats, playerEffects);

    if (session.swordImmune) {
        message += "Иммунитет к выпадению отрицательного числа при увеличении меча.\n"
    }

    message += `Количество попыток ограбления: ${session.game.chanceToSteal};\n`

    let [remain] = getTime(game.stealImmuneTimer);
    if (remain > 0) {
        message += `Иммунитет от ограбления: ${getStringRemainTime(remain)};\n`
    }

    return message;
};