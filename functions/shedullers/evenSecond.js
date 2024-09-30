import cron from 'node-cron';
import setHpRegen from './setHpRegen.js';
import setCpRegen from './setCpRegen.js';
import setMpRegen from './setMpRegen.js';
import respawnPlayer from './respawnPlayer.js';
import bossWin from './bossWin.js';

export default function () {
    cron.schedule("* * * * * *", () => {
        try {
            setHpRegen();
            setCpRegen();
            setMpRegen();
            respawnPlayer();
            bossWin();
        } catch (e) {
            console.error(e);
        }
    })
}