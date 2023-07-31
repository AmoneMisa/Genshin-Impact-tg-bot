const sendPhoto = require('../../../functions/tgBotFunctions/sendPhoto');
const buttonsDictionary = require('../../../dictionaries/buttons');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getUserName = require("../../../functions/getters/getUserName");
const getFile = require("../../../functions/getters/getFile");

module.exports = [[/(?:^|\s)\/select_gender\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const file = getFile("images/misc", "gender");

    await sendPhoto(msg.chat.id, file, {
        caption: `@${getUserName(session, "nickname")}, выбери свой пол`,
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