const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const controlButtons = require("../../../functions/keyboard/controlButtons");
const buildKeyboard = require("../../../functions/keyboard/buildKeyboard");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const getTime = require("../../../functions/getters/getTime");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");

module.exports = [[/(?:^|\s)\/steal_resources\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let buttons = buildKeyboard(msg.chat.id, "steal_resources", false, msg.from.id);

    if (!session.game.chanceToSteal && session.game.chanceToSteal !== 0) {
        session.game.chanceToSteal = 2;
    }
    let [attackerRemain] = getTime(session.game.stealImmuneTimer);

    if (attackerRemain) {
        await sendMessageWithDelete(callback.message.chat.id, `@${getUserName(session, "nickname")}, у тебя висит щит от ограблений. Если ты ограбишь кого-то, щит спадёт. Время действия щита: ${getStringRemainTime(attackerRemain)}`, {}, 15 * 1000);
    }

    if (session.game.chanceToSteal === 0) {
        return sendMessageWithDelete(msg.chat.id, `@${getUserName(session, "nickname")}, у тебя на данный момент нет попыток ограбления. Попытки восстанавливаются после 00.00 каждый день.`, {}, 15 * 1000);
    }

    await sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери, у кого хочешь украсть ресурсы.`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons("steal_resources", buttons, 1)
        }
    });
}]];