import cron from 'node-cron';
import initBossHpRegen from './initBossHpRegen.js';

export default function () {
    try {
        cron.schedule('*/2 * * * *', async () => {
            await initBossHpRegen();
        });
    } catch (e) {
        console.error(e);
    }
}