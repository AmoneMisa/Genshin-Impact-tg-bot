const cron = require("node-cron");
const checkAccumulateTimer = require("./checkAccumulateTimer");

module.exports = function () {
    cron.schedule('0 * * * *', () => {
        checkAccumulateTimer();
    });
}