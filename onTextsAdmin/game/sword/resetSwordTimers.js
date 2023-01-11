const bot = require('../../../bot');
const {myId} = require('../../../config');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getSession = require('../../../functions/getters/getSession');
const resetSwordTimer = require('../../../functions/game/sword/resetSwordTimer');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');

module.exports = [[/(?:^|\s)\/reset_sword_timer\b/, async (msg) => {
    try {
        if (msg.from.id !== myId) {
            return;
        }
        await getSession(msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);
        await resetSwordTimer();
        sendMessage(myId, "Сессии сброшены.");

    } catch (e) {
        debugMessage(`Command: /reset_sword_timer\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];