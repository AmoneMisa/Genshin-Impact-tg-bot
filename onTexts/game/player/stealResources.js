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

    const buttons = buildKeyboard(msg.chat.id, `stealResources.${msg.chat.id}`, false, msg.from.id);

    // инициализация попыток
    if (session.game.chanceToSteal === undefined || session.game.chanceToSteal === null) {
        session.game.chanceToSteal = 2;
        await session.save();
    }

    const [attackerRemain] = getTime(session.game.stealImmuneTimer);

    if (session.game.chanceToSteal === 0) {
        return sendMessageWithDelete(
            msg.from.id,
            `У тебя на данный момент нет попыток ограбления. Попытки восстанавливаются после 00.00 каждый день.`,
            {},
            15000
        );
    }

    const file = getFile("images/misc", "stealResources");

    let text = buttons.length
        ? `Выбери, у кого хочешь украсть ресурсы.`
        : `Не у кого красть ресурсы.`;

    if (attackerRemain > 0) {
        text += `\n\nУ тебя висит щит от ограблений. Если ты ограбишь кого-то, щит спадёт.\nВремя действия щита: ${getStringRemainTime(attackerRemain)}`;
    }

    const options = {
        caption: file ? text : undefined,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`stealResources.${msg.chat.id}`, buttons, 1)
        }
    };

    if (file) {
        await sendPhoto(msg.from.id, file, options);
    } else {
        await sendMessage(msg.from.id, text, options);
    }
}]];