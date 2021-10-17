const bot = require('../../../bot');
const {myId} = require('../../../config');
const sendMessage = require('../../../functions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const bossGetStats = require('../../../functions/boss/bossGetStats');

module.exports = [[/(?:^|\s)\/boss_my_stats\b/, async (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, `${bossGetStats(session)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        sendMessage(myId, `Command: /boss_my_stats\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}\nSession - ${session}`);
    }
}]];