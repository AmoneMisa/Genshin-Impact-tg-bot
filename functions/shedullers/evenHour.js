const cron = require("node-cron");
const checkAccumulateTimer = require("../game/builds/checkAccumulateTimer");
const restoreArenaChances = require("./restoreArenaChances");
const generateArenaBots = require("./generateArenaBots");

module.exports = function () {
    cron.schedule('0 * * * *', async () => {
        try {
            await checkAccumulateTimer();
            restoreArenaChances();
            generateArenaBots();
        } catch (e) {
            console.error(e);
        }
    });
}