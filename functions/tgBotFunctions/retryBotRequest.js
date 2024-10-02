import bot from '../../bot.js';
import sleep from './sleep.js';
import intel from 'intel';

const log = intel.getLogger("retryBotRequest");

function getRetryAfter(e) {
    if (e.code !== 'ETELEGRAM') {
        return 1;
    }

    if (e.response.body['error_code'] === 400) {
        console.error(Object.fromEntries(new URLSearchParams(e.response.request.body).entries()));
        return -1;
    }

    if (e.response.body['error_code'] === 429) {
        console.error(e);
        return e.response.body['parameters']['retry_after'];
    }

    return 1;
}

export default async function retryBotRequest(request) {
    let lastE = null;

    for (let i = 0; i < 5; i++) {
        try {
            return await request(bot);
        } catch (e) {
            lastE = e;
            log.info(`Try: %s`, i);
            let retryAfter = getRetryAfter(e);
            if (retryAfter === -1) {
                break;
            }
            log.info('Retry after: %s', retryAfter);
            if (e.response) {
                log.info('Body: %:2j', e.response.body);
            }
            await sleep(retryAfter * 1000);
        }
    }

    throw lastE;
};