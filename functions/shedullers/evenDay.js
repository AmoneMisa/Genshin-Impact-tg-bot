const cron = require("node-cron");
const restoreChancesToSteal = require("./restoreChancesToSteal");

module.exports = function () {
    cron.schedule('59 23 * * *', async () => {
        restoreChancesToSteal();
    });
}