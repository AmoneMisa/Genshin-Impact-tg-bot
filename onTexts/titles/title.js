const bot = require('../../bot');
const {myId} = require('../../config');
const {sessions} = require('../../data');
const sendMessage = require('../../functions/sendMessage');
const getSession = require('../../functions/getSession');
const titleMessage = require('../../functions/titles/titleMessage');
const buttonsDictionary = require('../../dictionaries/buttons');

module.exports = [[/(?:^|\s)\/title\b/, async (msg) => {
    try {
        let session = await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, titleMessage(msg.chat.id, session), {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        sendMessage(myId, `Command: /title\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];