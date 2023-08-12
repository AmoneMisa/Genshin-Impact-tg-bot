const getMaxHp = require("../game/player/getters/getMaxHp");
const {sessions} = require("../../data");

module.exports = function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            if (new Date().getTime() < session.game.respawnTime) {
                continue;
            }

            if (session.game.gameClass.stats.hp !== 0) {
                continue;
            }

            session.game.gameClass.stats.hp = getMaxHp(session, session.game.gameClass) * 0.5;
        }
    }
}