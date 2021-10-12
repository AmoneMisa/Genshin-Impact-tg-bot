const bot = require('../../../bot');
const {myId} = require('../../../config');
const {sessions} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const getSession = require('../../../functions/getSession');

module.exports = [[/(?:^|\s)\/potion_([0-9]+)\b/, async (msg, regExp) => {
    try {
        const potion = regExp[1];
        let session = await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);
        for (let item of session.game.inventory.potions) {
            if (item.name.includes(potion) && session.game.inventory.potions[0].count > 0) {
                session.game.inventory.potions[0].count--;
                session.game.boss.damagedHp -= parseInt(potion);
                sendMessage(msg.chat.id, `Ты использовал зелье восстановления хп (1000).`, {
                    disable_notification: true
                }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 5000));
                return ;
            } else if (item.name.includes(potion) && session.game.inventory.potions[1].count > 0) {
                session.game.inventory.potions[1].count--;
                session.game.boss.damagedHp -= parseInt(potion);
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
        sendMessage(myId, `Command: /potion_${regExp[1]}\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];