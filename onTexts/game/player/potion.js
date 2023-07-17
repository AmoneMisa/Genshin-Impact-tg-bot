const bot = require('../../../bot');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');

module.exports = [[/(?:^|\s)\/potion_([0-9]+)\b/, async (msg, regExp, session) => {
    try {
        const potion = regExp[1];
        bot.deleteMessage(msg.chat.id, msg.message_id);
        for (let item of session.game.inventory.potions) {
            if (item.name.includes(potion) && session.game.inventory.potions[0].count > 0) {
                session.game.inventory.potions[0].count--;
                session.game.stats.currentHp += parseInt(potion);
                sendMessage(msg.chat.id, `Ты использовал зелье восстановления хп (1000).`, {
                    disable_notification: true
                }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 5000));
                return ;
            } else if (item.name.includes(potion) && session.game.inventory.potions[1].count > 0) {
                session.game.inventory.potions[1].count--;
                session.game.stats.currentHp += parseInt(potion);
                sendMessage(msg.chat.id, `Ты использовал зелье восстановления хп (3000).`, {
                    disable_notification: true
                }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 5000));
                return ;
            }
        }

        sendMessage(msg.chat.id, `У тебя нет этого зелья.`, {
            disable_notification: true
        }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 5000));

    } catch (e) {
        debugMessage(`Command: /potion_${regExp[1]}\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];