import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import getMemberStatus from '../../../functions/getters/getMemberStatus.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/receive_user_title_timer\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = buildKeyboard(msg.chat.id, `receive_title_timer.${msg.chat.id}`);

    await sendMessage(msg.from.id, "Выбери, кому ты хочешь обнулить таймер титула", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`receive_title_timer.${msg.chat.id}`, buttons, 1)
        }
    });
}]];