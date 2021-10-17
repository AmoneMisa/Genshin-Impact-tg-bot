const sendMessage = require("../../functions/sendMessage");
const getSession = require("../../functions/getSession");

module.exports = [[/^set_timer\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        const [, chatId, userId] = callback.data.match(/^set_timer\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        targetSession.timerSwordCallback = 0;
        sendMessage(callback.message.chat.id, "Таймер обнулён.");
    } catch (e) {
        console.error(e);
    }
}]];