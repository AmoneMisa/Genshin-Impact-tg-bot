const {sessions} = require("../../data");
const isPlayerInFight = require("../game/player/isPlayerInFight");
const getMaxHp = require("../game/player/getters/getMaxHp");
const getCurrentHp = require("../game/player/getters/getCurrentHp");

module.exports = function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            let hpRegenSpeed = session.game.gameClass.stats.hpRestoreSpeed;

            if (getCurrentHp(session) > getMaxHp(session)) {
                session.game.gameClass.stats.hp = getMaxHp(session);
                continue;
            }

            if (getCurrentHp(session) === getMaxHp(session)) {
                continue;
            }

            if (getCurrentHp(session) <= 0) {
                continue;
            }

            if (isPlayerInFight(session)) {
                hpRegenSpeed *= 0.35;
            }

            session.game.gameClass.stats.hp = Math.min(getMaxHp(session), getCurrentHp(session) + hpRegenSpeed);
        }
    }
}