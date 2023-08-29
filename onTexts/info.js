const dictionary = require('../dictionaries/main');
const buttonsDictionary = require('../dictionaries/buttons');
const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/info/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    await sendMessage(msg.chat.id, `${dictionary["ru"].index}`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].info,
                callback_data: "info"
            }], [{
                text: buttonsDictionary["ru"].personal_info,
                callback_data: "personal_info"
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];