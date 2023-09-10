const cron = require("node-cron");
const checkAccumulateTimer = require("../game/builds/checkAccumulateTimer");
const restoreArenaChances = require("./restoreArenaChances");

module.exports = function () {
    cron.schedule('0 * * * *', async () => {
        try {
            await checkAccumulateTimer();
            restoreArenaChances();
        } catch (e) {
            console.error(e);
        }
    });
}