const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getMembers = require('../../../functions/getters/getMembers');
const buttonsDictionary = require('../../../dictionaries/buttons');
const swordsMessage = require('../../../functions/game/sword/swordsMessage');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/swords\b/, async (msg) => {
    try {
        deleteMessage(msg.chat.id, msg.message_id);
        let members = getMembers(msg.chat.id);

        sendMessage(msg.chat.id, `${swordsMessage(members)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`Command: /swords\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];