const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getRandomChest = require('../../../functions/game/chest/getRandomChest');
const getTime = require('../../../functions/getters/getTime');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/chest\b/, async (msg, session) => {
    try {
        deleteMessage(msg.chat.id, msg.message_id);

        let [remain, hours, minutes, seconds] = getTime(session.timerOpenChestCallback);

        if (remain > 0) {
            if (hours > 0) {
                return sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`, {
                    disable_notification: true,
                }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 6000));
            } else if (minutes > 0) {
                return sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${minutes} мин ${seconds} сек`, {
                    disable_notification: true,
                }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 6000));
            } else {
                return sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${seconds} сек`, {
                    disable_notification: true,
                }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 6000));
            }
        }

        let buttons = getRandomChest();

        sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери три сундучка!`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [
                    ...buttons
                ]
            }
        })

    } catch (e) {
        debugMessage(`Command: /chest\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];