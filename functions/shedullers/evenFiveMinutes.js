const cron = require("node-cron");
const timerForAccumulateResources = require("./timerForAccumulateResources");

module.exports = function () {
    try {
        cron.schedule('5 * * * *', async () => {
            await timerForAccumulateResources();
        })
    } catch (e) {
        console.error(e);
    }
}