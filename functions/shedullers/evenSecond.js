import cron from 'node-cron';
import setHpRegen from './setHpRegen.js';
import setCpRegen from './setCpRegen.js';
import setMpRegen from './setMpRegen.js';
import respawnPlayer from './respawnPlayer.js';
import bossWin from './bossWin.js';
import bossLiveAttacks from './bossLiveAttacks.js';

export default function () {
    let isRunning = false;

    cron.schedule("* * * * * *", async () => {
        if (isRunning) {
            return;
        }
        isRunning = true;

        try {
            await setHpRegen();
            await setCpRegen();
            await setMpRegen();
            await respawnPlayer();
            await bossWin();
            await bossLiveAttacks();
        } catch (e) {
            console.error(e);
        } finally {
            isRunning = false;
        }
    })
}