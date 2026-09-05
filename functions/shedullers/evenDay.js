import cron from 'node-cron';
import restoreChancesToSteal from './restoreChancesToSteal.js';
import restoreChestChances from './restoreChestChances.js';
import restoreBonusChances from './restoreBonusChances.js';
import updateFreeSpins from './updateFreeSpins.js';
import hideDeadSouls from '../misc/hideDeadSouls.js';
import restoreArenaDailyChances from './restoreArenaDailyChances.js';
import resetClanQuizzes from './resetClanQuizzes.js';
import resetClanTasks from './resetClanTasks.js';

export default function () {
    cron.schedule('59 23 * * *', async () => {
        try {
            await restoreChancesToSteal();
            await restoreChestChances();
            await restoreBonusChances();
            await updateFreeSpins();
            await restoreArenaDailyChances();
            await hideDeadSouls();
            await resetClanQuizzes();
            await resetClanTasks();
        } catch (e) {
            console.error(e);
        }
    });
}