const cron = require("node-cron");
const restoreChancesToSteal = require("./restoreChancesToSteal");
const restoreBonusChances = require("./restoreBonusChances");
const updateFreeSpins = require("./updateFreeSpins");
const hideDeadSouls = require('../misc/hideDeadSouls');
const restoreArenaDailyChances = require('./restoreArenaDailyChances');

module.exports = function () {
    cron.schedule('59 23 * * *', async () => {
        try {
            restoreChancesToSteal();
            restoreBonusChances();
            updateFreeSpins();
            restoreArenaDailyChances();
            await hideDeadSouls();
        } catch (e) {
            console.error(e);
        }
    });
}