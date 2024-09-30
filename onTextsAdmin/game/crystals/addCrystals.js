import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import getMemberStatus from '../../../functions/getters/getMemberStatus.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/add_crystals\b/, (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = buildKeyboard(msg.chat.id, `add_crystals.${msg.chat.id}`);

    sendMessage(msg.from.id, "Выбери, кому ты хочешь добавить кристаллов", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`add_crystals.${msg.chat.id}`, buttons, 1)
        }
    });
}]];