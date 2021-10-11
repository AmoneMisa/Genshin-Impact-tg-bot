const bot = require('../../../bot');
const {myId} = require('../../../config');
const {sessions, bosses} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const getSession = require('../../../functions/getSession');
const bossHP = require('../../../functions/boss/summonBoss');

module.exports = [[/(?:^|\s)\/summon_boss\b/, async (msg) => {
    try {
        await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, `${await bossHP(msg.chat.id, bosses, sessions[msg.chat.id])}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        sendMessage(myId, `Command: /summon_boss\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];