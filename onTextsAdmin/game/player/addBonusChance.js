import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import getMemberStatus from '../../../functions/getters/getMemberStatus.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/add_bonus_chance\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = buildKeyboard(msg.chat.id, `add_bonus_chance.${msg.chat.id}`);

    await sendMessage(msg.from.id, "Выбери, кому ты хочешь добавить попытку бонуса", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`add_bonus_chance.${msg.chat.id}`, buttons, 1)
        }
    });
}]];