const bot = require('../../bot');
const debugMessage = require('../../functions/debugMessage');
const dictionary = require('../../dictionaries/main');
const sendMessage = require('../../functions/sendMessage');
const deleteMessageTimeout = require('../../functions/deleteMessageTimeout');
const setButtons = require('../../functions/menu/setButtons');
const commands = require('../../dictionaries/commands');

module.exports = [[/(?:^|\s)\/menu/, async (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let buttons = setButtons(commands);

        let name = session.userChatData.user.username !== undefined ? session.userChatData.user.username : session.userChatData.user.first_name;

        sendMessage(msg.chat.id, `@${name}, ${dictionary["ru"].index}`, {
            disable_notification: true,
            reply_markup: JSON.stringify({
                selective: true,
                keyboard: buttons,
                one_time_keyboard: true
            })
        }).then(message => {
            session.keyboardMessage = message;
            deleteMessageTimeout(msg.chat.id, message.message_id, 10000);
        })
    } catch (e) {
        debugMessage(`Command: /menu\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];