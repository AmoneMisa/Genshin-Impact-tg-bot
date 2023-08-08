const {sessions} = require("../../data");
const isPlayerInFight = require("../game/player/isPlayerInFight");
const getMaxCp = require("../game/player/getters/getMaxCp");
const getCurrentCp = require("../game/player/getters/getCurrentCp");

module.exports = function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            let cpRegenSpeed = session.game.gameClass.stats.cpRestoreSpeed;

            if (getCurrentCp(session) > getMaxCp(session)) {
                session.game.gameClass.stats.cp = getMaxCp(session);
                continue;
            }

            if (getCurrentCp(session) === getMaxCp(session)) {
                continue;
            }

            if (isPlayerInFight(session)) {
                cpRegenSpeed *= 0.2;
            }

            session.game.gameClass.stats.cp = Math.min(getMaxCp(session), getCurrentCp(session) + cpRegenSpeed);
        }
    }
}