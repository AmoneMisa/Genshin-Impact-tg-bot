const getUserName = require("../../getters/getUserName");
const getEmoji = require("../../getters/getEmoji");
const calcGearScore = require("../../../functions/game/player/calcGearScore");

module.exports = function (session) {
    return `${getUserName(session, "name")}\n
${getEmoji("lvl")} Уровень: ${session.game.stats.lvl}
${getEmoji(session.game.gameClass.stats.name)} Класс: ${session.game.gameClass.stats.translateName}
${getEmoji("gearScore")} Рейтинг снаряжения: ${calcGearScore(session.game)}`
}