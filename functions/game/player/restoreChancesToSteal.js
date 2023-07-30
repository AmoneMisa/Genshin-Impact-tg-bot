const cron = require("node-cron");
const {sessions} = require("../../../data");

module.exports = function () {
    cron.schedule('59 23 * * *', async () => {
        for (let chatSession of Object.values(sessions)) {
            for (let session of Object.values(chatSession.members)) {
                session.game.chanceToSteal = 2;
            }
        }
    });
}