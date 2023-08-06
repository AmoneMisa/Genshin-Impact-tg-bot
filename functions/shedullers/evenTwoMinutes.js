const cron = require("node-cron");
const initBossHpRegen = require("./initBossHpRegen");
const initBossDealDamage = require("./initBossDealDamage");

module.exports = function () {
    try {
        cron.schedule('*/2 * * * *', async () => {
            await initBossDealDamage();
            await initBossHpRegen();
        });
    } catch (e) {
        console.error(e);
    }
}