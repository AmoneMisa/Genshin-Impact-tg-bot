const cron = require("node-cron");
const {sessions} = require("../../../data");
const gachaTemplate = require("../../../templates/gachaTemplate");

module.exports = function () {
    cron.schedule('59 23 * * *', async () => {
        for (let chatSession of Object.values(sessions)) {
            for (let session of Object.values(chatSession.members)) {
                for (let [key, value] of gachaTemplate) {
                    session.game.gacha[key] = value.freeSpins;
                }
            }
        }
    });
}