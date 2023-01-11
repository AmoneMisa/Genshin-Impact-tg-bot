const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const bot = require('../../../bot');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const getSession = require('../../../functions/getters/getSession');
const getUserName = require('../../../functions/getters/getUserName');

module.exports = [[/^send_gold_recipient\.[^.]+$/, async function (session, callback) {
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    const [, userId] = callback.data.match(/^send_gold_recipient\.([^.]+)$/);
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
                return sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, у тебя столько нет. Посмотреть количество золота можно командой /whoami`)
                    .then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 10000));
            }

            if (session.game.inventory.gold >= gold) {
                recipient.game.inventory.gold += gold;
                session.game.inventory.gold -= gold;
            }

            bot.deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            bot.deleteMessage(msg.chat.id, msg.message_id);
            return sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, ты успешно перевёл ${gold} золота. Посмотреть количество золота можно командой /whoami`, {
                disable_notification: true
            }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 10000));
        });

    }).catch(e => {
        console.error(e);
    });
}], [/^send_gold_recipient_[^.]+$/, function (session, callback) {
    let [, page] = callback.data.match(/^send_gold_recipient_([^.]+)$/);
    page = parseInt(page);

    let buttons = buildKeyboard(callback.message.chat.id, 'send_gold_recipient');

    return bot.editMessageText(`Выбери интересующего тебя участника`, {
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