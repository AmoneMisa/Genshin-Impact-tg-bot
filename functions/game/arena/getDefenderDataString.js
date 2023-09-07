const getUserName = require("../../getters/getUserName");
const getEmoji = require("../../getters/getEmoji");
const calcGearScore = require("../../../functions/game/player/calcGearScore");

module.exports = function (session) {
    return `${getUserName(session)}\n\n${getEmoji("lvl")} ${session.game.stats.lvl}\n${session.game.gameClass.stats.name}\n${calcGearScore(session)}`;
}