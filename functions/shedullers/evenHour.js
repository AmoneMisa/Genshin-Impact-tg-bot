import cron from 'node-cron';
import checkAccumulateTimer from '../game/builds/checkAccumulateTimer.js';
import restoreArenaChances from './restoreArenaChances.js';
import generateArenaBots from './generateArenaBots.js';
import debugMessage from "../tgBotFunctions/debugMessage.js";

export default function () {
    cron.schedule('15 * * * *', () => {
        try {
            checkAccumulateTimer();
            restoreArenaChances();
            generateArenaBots();
        } catch (e) {
            console.error(e);
            debugMessage(`evenHour schedule error: ${e}`);
        }
    });
}