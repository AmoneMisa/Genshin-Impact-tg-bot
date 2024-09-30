import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getMemberStatus from '../../../functions/getters/getMemberStatus.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/add_gold\b/, (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);
    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = buildKeyboard(msg.chat.id, `add_gold.${msg.chat.id}`);

    sendMessage(msg.from.id, "Выбери, кому ты хочешь добавить золота", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`add_gold.${msg.chat.id}`, buttons, 1)
        }
    });
}]];