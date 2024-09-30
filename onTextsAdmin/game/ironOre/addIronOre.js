import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getMemberStatus from '../../../functions/getters/getMemberStatus.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/add_iron_ore\b/, (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);
    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = buildKeyboard(msg.chat.id, `add_iron_ore.${msg.chat.id}`);

    sendMessage(msg.from.id, "Выбери, кому ты хочешь добавить железной руды", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`add_iron_ore.${msg.chat.id}`, buttons, 1)
        }
    });
}]];