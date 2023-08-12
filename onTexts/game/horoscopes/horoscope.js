const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getRandom = require("../../../functions/getters/getRandom");
const horoscopes = require("../../../dictionaries/horoscopes");

module.exports = [[/(?:^|\s)\/horoscope\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let start = horoscopes.start[getRandom(0, horoscopes.start.length - 1)];
    let action = horoscopes.action[getRandom(0, horoscopes.action.length - 1)];
    let end = horoscopes.end[getRandom(0, horoscopes.end.length - 1)];


    return sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, твоё шуточное предсказание: ${start} ${action} ${end}`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    })
}]];