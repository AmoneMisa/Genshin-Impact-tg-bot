const bot = require('../../bot');
const {myId} = require('../../config');
const dictionary = require('../../dictionaries/main');
const sendMessage = require('../../functions/sendMessage');
const setButtons = require('../../functions/menu/setButtons');
const commands = require('../../dictionaries/commands');

module.exports = [[/(?:^|\s)\/menu/, async (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let buttons = setButtons(commands);

        sendMessage(msg.chat.id, `@${session.userChatData.user.username}, ${dictionary["ru"].index}`, {
            disable_notification: true,
            reply_markup: JSON.stringify({
                selective: true,
                keyboard: buttons,
                one_time_keyboard: true
            })
        }).then(message => {
            session.keyboardMessage = message;
        })
    } catch (e) {
        sendMessage(myId, `Command: /menu\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];