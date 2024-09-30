import cron from 'node-cron';
import restoreChancesToSteal from './restoreChancesToSteal.js';
import restoreChestChances from './restoreChestChances.js';
import restoreBonusChances from './restoreBonusChances.js';
import updateFreeSpins from './updateFreeSpins.js';
import hideDeadSouls from '../misc/hideDeadSouls.js';
import restoreArenaDailyChances from './restoreArenaDailyChances.js';

export default function () {
    cron.schedule('59 23 * * *', async () => {
        try {
            restoreChancesToSteal();
            restoreChestChances();
            restoreBonusChances();
            updateFreeSpins();
            restoreArenaDailyChances();
            await hideDeadSouls();
        } catch (e) {
            console.error(e);
        }
    });
}