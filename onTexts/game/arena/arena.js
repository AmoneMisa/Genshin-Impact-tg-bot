const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getFile = require("../../../functions/getters/getFile");
const sendPhoto = require("../../../functions/tgBotFunctions/sendPhoto");

module.exports = [[/(?:^|\s)\/arena\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const file = getFile("images/misc", "arena");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
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