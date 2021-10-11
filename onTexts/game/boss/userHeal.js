const bot = require('../../../bot');
const {myId} = require('../../../config');
const {sessions} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const getSession = require('../../../functions/getSession');

module.exports = [[/(?:^|\s)\/heal_yourself\b/, async (msg) => {
    try {
        let session = await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        if (session.game.inventory.potions[0].count === 0 && session.game.inventory.potions[1].count === 0) {
            return sendMessage(msg.chat.id, `@${session.userChatData.user.username}, у тебя нет зелий восстановления хп. Их можно купить в магазине /boss_shop.`, {
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
        sendMessage(myId, `Command: /heal_yourself\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];