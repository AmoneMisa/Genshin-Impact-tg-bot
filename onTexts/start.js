const bot = require('../bot');
const {myId} = require('../config');
const dictionary = require('../dictionaries/main');
const buttonsDictionary = require('../dictionaries/buttons');
const {sessions} = require('../data');
const sendMessage = require('../functions/sendMessage');
const getSession = require('../functions/getSession');

module.exports = [[/(?:^|\s)\/start/, async (msg) => {
    try {
        await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);
        sendMessage(msg.chat.id, `${dictionary["ru"].index}`, {
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
    } catch (e) {
        sendMessage(myId, `Command: /start\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];