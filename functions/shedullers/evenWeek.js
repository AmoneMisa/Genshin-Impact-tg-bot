const cron = require("node-cron");
const renewArenaRating = require("./renewArenaRating");

module.exports = function () {
    cron.schedule('0 0 * * 1', async () => {
        try {
            renewArenaRating();
        } catch (e) {
            console.error(e);
        }
    });
}