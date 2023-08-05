const {sessions} = require("../../data");
const getMaxMp = require("../game/player/getMaxMp");
const getCurrentMp = require("../game/player/getCurrentMp");

module.exports = function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            let mpRegenSpeed = session.game.gameClass.stats.mpRestoreSpeed;
            if (getCurrentMp(session) === getMaxMp(session)) {
                continue;
            }

            session.game.gameClass.stats.mp = Math.min(getMaxMp(session), getCurrentMp(session) + mpRegenSpeed);
        }
    }
}