const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getMembers = require('../../../functions/getters/getMembers');
const buttonsDictionary = require('../../../dictionaries/buttons');
const swordsMessage = require('../../../functions/game/sword/swordsMessage');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/swords\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let members = getMembers(msg.chat.id);

    await sendMessage(msg.chat.id, `${swordsMessage(members)}`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];