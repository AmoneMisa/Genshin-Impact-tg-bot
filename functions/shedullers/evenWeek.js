import cron from 'node-cron';
import renewArenaRating from './renewArenaRating.js';
import sendArenaWeeklyPrizes from './sendArenaWeeklyPrizes.js';

export default function () {
    cron.schedule('0 0 * * 1', async () => {
        try {
            await renewArenaRating();
            await sendArenaWeeklyPrizes();
        } catch (e) {
            console.error(e);
        }
    });
}