import cron from 'node-cron';
import checkAccumulateTimer from '../game/builds/checkAccumulateTimer.js';
import restoreArenaChances from './restoreArenaChances.js';
import generateArenaBots from './generateArenaBots.js';
import debugMessage from "../tgBotFunctions/debugMessage.js";
import {sweepAuction, mongoAuctionStore} from '../../miniapp/auction.js';
import getSession from '../getters/getSession.js';
import saveSession from '../getters/saveSession.js';
import {withLock} from '../general/chatLock.js';

export default function () {
    cron.schedule('0 * * * *', async () => {
        try {
            await checkAccumulateTimer();
            await restoreArenaChances();
            await generateArenaBots();
            // unpaid auction sales and lots that ran out are mailed to their sellers
            await sweepAuction(await mongoAuctionStore(), {withLock, getSession, saveSession});
        } catch (e) {
            console.error(e);
            debugMessage(`evenHour schedule error: ${e}`);
        }
    });
}