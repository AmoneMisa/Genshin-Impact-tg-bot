const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/whats_new/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    await sendMessage(msg.from.id, "Настройки уведомлений о новых возможностях бота (обновлениях).", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: session.whatsNewSettings.button.text,
                callback_data: session.whatsNewSettings.button.callback_data
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}]];