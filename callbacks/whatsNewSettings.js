import invertButtonCallbackData from '../functions/keyboard/invertButtonCallbackData.js';
import setButtonText from '../functions/keyboard/setButtonText.js';
import editMessageText from '../functions/tgBotFunctions/editMessageText.js';

export default [[/^whatsNew\.([0-1]+)$/, async function (session, callback, [, flag]) {
    if (session.whatsNewSettings.button.callback_data === callback.data) {
        session.whatsNewSettings.button.callback_data = invertButtonCallbackData(session.whatsNewSettings.button.callback_data);
        session.whatsNewSettings.flag = 1 - session.whatsNewSettings.flag;
        session.whatsNewSettings.button.text = setButtonText(session.whatsNewSettings.button.text, flag, true);
    }

    await editMessageText("Настройки уведомлений о новых возможностях бота (обновлениях).", {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[
                session.whatsNewSettings.button
            ], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}]];