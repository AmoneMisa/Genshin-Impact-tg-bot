import cron from 'node-cron';
import checkAccumulateTimer from '../game/builds/checkAccumulateTimer.js';
import restoreArenaChances from './restoreArenaChances.js';
import generateArenaBots from './generateArenaBots.js';

export default function () {
    cron.schedule('0 * * * *', async () => {
        try {
            await checkAccumulateTimer();
            restoreArenaChances();
            generateArenaBots();
        } catch (e) {
            console.error(e);
        }
    });
}