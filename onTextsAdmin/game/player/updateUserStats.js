import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getMemberStatus from '../../../functions/getters/getMemberStatus.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';

export default [[/(?:^|\s)\/update_characteristics\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = [...buildKeyboard(msg.chat.id, `update_characteristics.${msg.chat.id}`), [{text: "Все", callback_data: `update_characteristics.${msg.chat.id}.all`}]];

    await sendMessage(msg.from.id, "Выбери, кому ты хочешь пересчитать характеристики", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`update_characteristics.${msg.chat.id}`, buttons, 1)
        }
    });
}]];