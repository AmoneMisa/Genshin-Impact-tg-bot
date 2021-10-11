const sendMessage = require('../../functions/sendMessage');
const {sessions} = require('../../data');
const bot = require('../../bot');

module.exports = [[/^send_gold_recipient\.[^.]+$/, function (session, callback) {
    if (callback.from.id !== session.userChatData.user.id) {
        return;
    }

    const [, userId] = callback.data.match(/^send_gold_recipient\.([^.]+)$/);

    sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, сколько хочешь передать? Можно вводить только цифры и целочисленные значения.`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let gold = parseInt(replyMsg.text);

            if (session.game.inventory.gold < gold) {
                return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, у тебя столько нет. Посмотреть количество золота можно командой /boss_my_stats`);
            }

            if (session.game.inventory.gold >= gold) {
                sessions[callback.message.chat.id][userId].game.inventory.gold += gold;
                session.game.inventory.gold -= gold;
            }
            bot.deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            bot.deleteMessage(msg.chat.id, msg.message_id);
            return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, ты успешно перевёл ${gold} золота. Посмотреть количество золота можно командой /boss_my_stats`, {
                disable_notification: true
            });
        });

    }).catch(e => {
        console.error(e);
    });
}]];