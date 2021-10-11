const bot = require('../../../bot');
const {myId} = require('../../../config');
const {sessions, bosses} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const bossUsersDamage = require('../../../functions/boss/bossUsersDamage');
const getSession = require('../../../functions/getSession');

module.exports = [[/(?:^|\s)\/boss_show_hp\b/, async (msg) => {
    try {
        await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, `${bossUsersDamage(bosses[msg.chat.id], sessions[msg.chat.id])}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        sendMessage(myId, `Command: /boss_show_hp\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];