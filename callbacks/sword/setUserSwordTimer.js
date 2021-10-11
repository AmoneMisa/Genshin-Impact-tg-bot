const {sessions} = require("../../data");
const sendMessage = require("../../functions/sendMessage");

module.exports = [[/^set_timer\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        const [, chatId, userId] = callback.data.match(/^set_timer\.([\-0-9]+)\.([0-9]+)$/);
        sessions[chatId][userId].timerSwordCallback = 0;
        sendMessage(callback.message.chat.id, "Таймер обнулён.");
    } catch (e) {
        console.error(e);
    }
}]];