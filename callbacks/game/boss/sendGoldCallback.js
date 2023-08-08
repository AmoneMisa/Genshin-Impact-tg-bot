const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const bot = require('../../../bot');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const getSession = require('../../../functions/getters/getSession');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');
const checkUserCall = require("../../../functions/misc/checkUserCall");

module.exports = [[/^send_gold_recipient\.([^.]+)$/, async function (session, callback, [, userId]) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    const recipient = await getSession(callback.message.chat.id, userId);

    sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, сколько хочешь передать? Можно вводить только цифры и целочисленные значения.`, {
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
                return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(session, "nickname")}, у тебя столько нет. Посмотреть количество золота можно командой /whoami`, 10 * 1000);
            }

            if (session.game.inventory.gold >= gold) {
                recipient.game.inventory.gold += gold;
                session.game.inventory.gold -= gold;
            }

            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            return editMessageText(`@${getUserName(session, "nickname")}, ты успешно перевёл ${gold} золота. Посмотреть количество золота можно командой /whoami`, {
                chat_id: callback.message.chat.id,
                message_id: msg.message_id,
                disable_notification: true
            }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 10 * 1000));
        });

    }).catch(e => {
        console.error(e);
    });
}], [/^send_gold_recipient_([^.]+)$/, function (session, callback, [, page]) {
    page = parseInt(page);

    let buttons = buildKeyboard(callback.message.chat.id, 'send_gold_recipient');

    return editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons("send_gold_recipient", buttons, page)
            ]
        }
    });
}]];