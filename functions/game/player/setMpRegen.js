const {sessions} = require("../../../data");
const cron = require("node-cron");

module.exports = function () {
    cron.schedule("* * * * * *", () => {
        for (let chatSession of Object.values(sessions)) {
            for (let session of Object.values(chatSession.members)) {
                let mpRegenSpeed = session.game.gameClass.stats.mpRestoreSpeed;
                if (session.game.gameClass.stats.mp === session.game.gameClass.stats.maxMp) {
                    continue;
                }

                session.game.gameClass.stats.mp = Math.min(session.game.gameClass.stats.maxMp, session.game.gameClass.stats.mp + mpRegenSpeed);
            }
        }
    })
}