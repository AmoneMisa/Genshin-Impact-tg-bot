import getMemberStatus from '../functions/getters/getMemberStatus.js';
import getChatSessionSettings from '../functions/getters/getChatSessionSettings.js';
import getChatSession from '../functions/getters/getChatSession.js';
import invertButtonCallbackData from '../functions/keyboard/invertButtonCallbackData.js';
import setButtonText from '../functions/keyboard/setButtonText.js';
import controlButtons from '../functions/keyboard/controlButtons.js';
import editMessageText from '../functions/tgBotFunctions/editMessageText.js';

export default [[/^settings\.([^.]+)\.([0-1]+)$/, async function (session, callback, [, setting, flag]) {
    let chatSession = getChatSession(callback.message.chat.id);
    if (!getMemberStatus(callback.message.chat.id, chatSession.settingsMessageId)) {
        return;
    }

    let settings = getChatSessionSettings(callback.message.chat.id);
    settings[setting] = parseInt(flag);

    for (const buttonLine of chatSession.settingsButtons) {
        for (const button of buttonLine) {
            if (button.callback_data === callback.data) {
                button.callback_data = invertButtonCallbackData(button.callback_data);
                button.text = setButtonText(button.text, flag);
            }
        }
    }

    await editMessageText("Нажми на кнопку, чтобы включить или отключить функцию.", {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...controlButtons("settings", chatSession.settingsButtons, 1)]
        }
    });
}], [/^settings_([^.]+)$/, async function (session, callback, [, page]) {
    let chatSession = getChatSession(callback.message.chat.id);
    if (!getMemberStatus(callback.message.chat.id, chatSession.settingsMessageId)) {
        return;
    }
    page = parseInt(page);

    await editMessageText("Нажми на кнопку, чтобы включить или отключить функцию.", {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...controlButtons("settings", chatSession.settingsButtons, page)]
        }
    });
}]];