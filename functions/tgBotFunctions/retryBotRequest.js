const bot = require("../../bot");
const sleep = require("./sleep");
const intel = require("intel");

const log = intel.getLogger("retryBotRequest");

function getRetryAfter(e) {
    if (e.code !== 'ETELEGRAM') {
        return 1;
    }

    if (e.response.body['error_code'] !== 429) {
        return 1;
    }

    return e.response.body['parameters']['retry_after'];
}

module.exports = async function retryBotRequest(request) {
    let lastE = null;

    for (let i = 0; i < 5; i++) {
        try {
            return await request(bot);
        } catch (e) {
            lastE = e;
            log.info(`Try: %s`, i);
            let retryAfter = getRetryAfter(e);
            log.info('Retry after: %s', retryAfter);
            if (e.response) {
                log.info('Body: %:2j', e.response.body);
            }
            await sleep(retryAfter * 1000);
        }
    }

    throw lastE;
};