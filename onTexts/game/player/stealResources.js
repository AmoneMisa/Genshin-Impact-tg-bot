import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getTime from '../../../functions/getters/getTime.js';
import getStringRemainTime from '../../../functions/getters/getStringRemainTime.js';
import getFile from '../../../functions/getters/getFile.js';

export default [[/(?:^|\s)\/steal_resources\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let buttons = buildKeyboard(msg.chat.id, `stealResources.${msg.chat.id}`, false, msg.from.id);

    if (!session.game.chanceToSteal && session.game.chanceToSteal !== 0) {
        session.game.chanceToSteal = 2;
    }

    let [attackerRemain] = getTime(session.game.stealImmuneTimer);

    if (session.game.chanceToSteal === 0) {
        return sendMessageWithDelete(msg.from.id, `У тебя на данный момент нет попыток ограбления. Попытки восстанавливаются после 00.00 каждый день.`, {
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