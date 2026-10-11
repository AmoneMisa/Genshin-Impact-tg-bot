import retryBotRequest from './retryBotRequest.js';
import { isClanScope } from '../game/clans/clanScope.js';

export default function (chatId, text, form) {
    // the hidden chat of a clan boss is not a Telegram chat
    if (isClanScope(chatId)) return Promise.resolve(null);
    return retryBotRequest(bot => bot.sendMessage(chatId, text, form));
};