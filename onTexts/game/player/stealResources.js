const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const sendPhoto = require('../../../functions/tgBotFunctions/sendPhoto');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const controlButtons = require("../../../functions/keyboard/controlButtons");
const buildKeyboard = require("../../../functions/keyboard/buildKeyboard");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const getTime = require("../../../functions/getters/getTime");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");
const getFile = require("../../../functions/getters/getFile");

module.exports = [[/(?:^|\s)\/steal_resources\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let buttons = buildKeyboard(msg.chat.id, `stealResources.${msg.chat.id}`, false, msg.from.id);

    if (!session.game.chanceToSteal && session.game.chanceToSteal !== 0) {
        session.game.chanceToSteal = 2;
    }

    let [attackerRemain] = getTime(session.game.stealImmuneTimer);

    if (session.game.chanceToSteal === 0) {
        return sendMessageWithDelete(msg.from.id, `У тебя на данный момент нет попыток ограбления. Попытки восстанавливаются после 00.00 каждый день.`, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
        }, 15 * 1000);
    }

    const file = getFile("images/misc", "stealResources");

    let text = "";
    if (buttons.length) {
        text = `Выбери, у кого хочешь украсть ресурсы.`;
    } else {
        text = `Не у кого красть ресурсы.`
    }

    if (attackerRemain > 0) {
        text += `У тебя висит щит от ограблений. Если ты ограбишь кого-то, щит спадёт. Время действия щита: ${getStringRemainTime(attackerRemain)}`;
    }

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: text,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: controlButtons(`stealResources.${msg.chat.id}`, buttons, 1)
            }
        });
    } else {
        await sendMessage(msg.from.id, text, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: controlButtons(`stealResources.${msg.chat.id}`, buttons, 1)
            }
        });
    }
}]];