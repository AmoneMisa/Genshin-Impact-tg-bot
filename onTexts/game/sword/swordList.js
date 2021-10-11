const bot = require('../../../bot');
const {myId} = require('../../../config');
const {sessions} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const getSession = require('../../../functions/getSession');
const buttonsDictionary = require('../../../dictionaries/buttons');
const swordsMessage = require('../../../functions/sword/swordsMessage');

module.exports = [[/(?:^|\s)\/all_swords\b/, async (msg) => {
    try {
        await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, `${swordsMessage(sessions[msg.chat.id])}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        sendMessage(myId, `Command: /all_swords\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];