const cron = require("node-cron");
const renewArenaRating = require("./renewArenaRating");
const sendArenaWeeklyPrizes = require("./sendArenaWeeklyPrizes");

module.exports = function () {
    cron.schedule('0 0 * * 1', async () => {
        try {
            renewArenaRating();
            sendArenaWeeklyPrizes();
        } catch (e) {
            console.error(e);
        }
    });
}