import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getFile from '../../../functions/getters/getFile.js';
import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';

export default [[/(?:^|\s)\/arena\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const file = getFile("images/misc", "arena");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: "Какой тип арены тебя интересует?",
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Обычная",
                    callback_data: `arena.common.${msg.chat.id}`
                }], [{
                    text: "Мировая",
                    callback_data: `arena.expansion.${msg.chat.id}`
                }], [{
                    text: "Магазин арены",
                    callback_data: `arena.shop.${msg.chat.id}`
                }],[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    } else {
        await sendMessage(msg.from.id, `Какой тип арены тебя интересует?`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Обычная",
                    callback_data: `arena.common.${msg.chat.id}`
                }], [{
                    text: "Мировая",
                    callback_data: `arena.expansion.${msg.chat.id}`
                }],[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    }
}]];