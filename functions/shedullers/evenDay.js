const cron = require("node-cron");
const restoreChancesToSteal = require("./restoreChancesToSteal");
const updateFreeSpins = require("./updateFreeSpins");

module.exports = function () {
    cron.schedule('59 23 * * *', async () => {
        try {
            restoreChancesToSteal();
            updateFreeSpins();
        } catch (e) {
            console.error(e);
        }
    });
}