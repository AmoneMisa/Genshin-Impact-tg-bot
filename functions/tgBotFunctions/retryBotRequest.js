import bot from '../../bot.js';
import sleep from './sleep.js';

function getTelegramErrorCode(error) {
    return Number(error?.errorCode ?? error?.response?.body?.error_code) || null;
}

function getRetryAfter(error) {
    const errorCode = getTelegramErrorCode(error);

    // Telegram API request validation errors are deterministic; retrying them
    // only spams the API. v2 exposes errorCode directly on TelegramApiError.
    if (errorCode === 400) return -1;

    if (errorCode === 429) {
        return Number(error?.retryAfter ?? error?.parameters?.retry_after ?? error?.response?.body?.parameters?.retry_after) || 1;
    }

    // NetworkError (EFETCH), TimeoutError (ETIMEOUT) and 5xx errors are safe to
    // retry with the legacy short backoff.
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
            const errorCode = getTelegramErrorCode(error);

            console.warn(`[telegram] request failed, attempt ${attempt}/5`, {
                code: error?.code,
                errorCode,
                retryAfter,
            });

            if (retryAfter === -1) break;
            await sleep(retryAfter * 1000);
        }
    }

    throw lastError;
}
