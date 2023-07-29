const {sessions} = require("../../../data");
const cron = require("node-cron");
const isPlayerInFight = require("./isPlayerInFight");

module.exports = function () {
    cron.schedule("* * * * * *", () => {
        for (let chatSession of Object.values(sessions)) {
            for (let session of Object.values(chatSession.members)) {
                let hpRegenSpeed = session.game.gameClass.stats.hpRestoreSpeed;
                if (session.game.gameClass.stats.hp === session.game.gameClass.stats.maxHp) {
                    continue;
                }

                if (session.game.gameClass.stats.hp <= 0) {
                    continue;
                }

                if (isPlayerInFight(session)) {
                    continue;
                }

                session.game.gameClass.stats.hp = Math.min(session.game.gameClass.stats.maxHp, session.game.gameClass.stats.hp + hpRegenSpeed);
            }
        }
    })
}