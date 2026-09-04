import bot from '../../bot.js';
import sleep from './sleep.js';

function getRetryAfter(e) {
    if (e.code !== 'ETELEGRAM') {
        return 1;
    }

    if (e.response?.body?.error_code === 400) {
        const requestBody = e.response?.request?.body;
        if (requestBody) {
            console.error('[telegram] invalid request:', Object.fromEntries(new URLSearchParams(requestBody).entries()));
        }
        return -1;
    }

    if (e.response?.body?.error_code === 429) {
        return Number(e.response.body?.parameters?.retry_after) || 1;
    }

    return 1;
}

export default async function(request) {
    let lastError = null;

    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            return await request(bot);
        } catch (error) {
            lastError = error;
            const retryAfter = getRetryAfter(error);

            console.warn(`[telegram] request failed, attempt ${attempt}/5`, {
                code: error?.code,
                errorCode: error?.response?.body?.error_code,
                retryAfter,
            });

            if (retryAfter === -1) break;
            await sleep(retryAfter * 1000);
        }
    }

    throw lastError;
}
