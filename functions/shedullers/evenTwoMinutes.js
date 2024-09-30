import cron from 'node-cron';
import initBossHpRegen from './initBossHpRegen.js';
import initBossDealDamage from './initBossDealDamage.js';

export default function () {
    try {
        cron.schedule('*/2 * * * *', async () => {
            await initBossDealDamage();
            await initBossHpRegen();
        });
    } catch (e) {
        console.error(e);
    }
}