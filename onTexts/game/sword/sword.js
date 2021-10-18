const bot = require('../../../bot');
const {myId} = require('../../../config');
const sendMessage = require('../../../functions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const swordResult = require('../../../functions/game/sword/swordResult');

module.exports = [[/(?:^|\s)\/sword\b/, async (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, `${swordResult(session)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        sendMessage(myId, `Command: /sword\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];