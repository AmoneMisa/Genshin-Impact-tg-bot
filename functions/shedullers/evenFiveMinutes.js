const cron = require("node-cron");
const timerForAccumulateResources = require("./timerForAccumulateResources");

module.exports = function () {
    cron.schedule('5 * * * *', async () => {
        await timerForAccumulateResources();
    })
}