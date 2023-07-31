const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getUserName = require("../../../functions/getters/getUserName");

module.exports = [[/(?:^|\s)\/select_gender\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    await sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери свой пол`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Мужской",
                callback_data: `gender.male`
            }], [{
                text: "Женский",
                callback_data: `gender.female`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];