import cron from 'node-cron';
import timerForAccumulateResources from './timerForAccumulateResources.js';

export default function () {
    try {
        cron.schedule('5 * * * *', async () => {
            await timerForAccumulateResources();
        })
    } catch (e) {
        console.error(e);
    }
}