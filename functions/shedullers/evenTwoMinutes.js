const cron = require("node-cron");
const initBossHpRegen = require("./initBossHpRegen");
const initBossDealDamage = require("./initBossDealDamage");

module.exports = function () {
    cron.schedule('*/2 * * * *', async () => {
        await initBossDealDamage();
        await initBossHpRegen();
    });
}