const {sessions} = require("../../../data");
const cron = require("node-cron");
const isPlayerInFight = require("./isPlayerInFight");

module.exports = function () {
    cron.schedule("* * * * * *", () => {
        for (let chatSession of Object.values(sessions)) {
            for (let session of Object.values(chatSession.members)) {
                let cpRegenSpeed = session.game.gameClass.stats.cpRestoreSpeed;
                if (session.game.gameClass.stats.cp === session.game.gameClass.stats.maxCp) {
                    continue;
                }

                if (isPlayerInFight(session)) {
                    continue;
                }

                session.game.gameClass.stats.cp = Math.min(session.game.gameClass.stats.maxCp, session.game.gameClass.stats.cp + cpRegenSpeed);
            }
        }
    })
}