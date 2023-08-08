const {sessions} = require("../../data");
const getMaxMp = require("../game/player/getters/getMaxMp");
const getCurrentMp = require("../game/player/getters/getCurrentMp");

module.exports = function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            let mpRegenSpeed = session.game.gameClass.stats.mpRestoreSpeed;
            if (getCurrentMp(session) > getMaxMp(session)) {
                session.game.gameClass.stats.mp = getMaxMp(session);
                continue;
            }

            if (getCurrentMp(session) === getMaxMp(session)) {
                continue;
            }

            session.game.gameClass.stats.mp = Math.min(getMaxMp(session), getCurrentMp(session) + mpRegenSpeed);
        }
    }
}