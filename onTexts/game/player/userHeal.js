const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const debugMessage = require('../../../functions/debugMessage');

module.exports = [[/(?:^|\s)\/heal\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        if (session.game.inventory.potions[0].count === 0 && session.game.inventory.potions[1].count === 0) {
            return sendMessage(msg.chat.id, `@${session.userChatData.user.username}, у тебя нет зелий восстановления хп. Их можно купить в магазине /shop.`, {
                disable_notification: true,
                reply_markup: {
                    selective: true
                }
            })
        }

        sendMessage(msg.chat.id, `@${session.userChatData.user.username}, выбери зелье:\n\nВосстанавливает 1000 хп: /potion_1000\nВосстанавливает 3000 хп: /potion_3000`, {
            disable_notification: true,
            reply_markup: {
                selective: true
            }
        });
    } catch (e) {
        debugMessage(`Command: /heal\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];