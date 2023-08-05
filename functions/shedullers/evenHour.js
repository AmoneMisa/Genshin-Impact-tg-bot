const cron = require("node-cron");
const checkAccumulateTimer = require("../game/builds/checkAccumulateTimer");

module.exports = function () {
    cron.schedule('0 * * * *', async () => {
        await checkAccumulateTimer();
    });
}