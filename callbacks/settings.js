const bot = require('../bot');
const getMemberStatus = require("../functions/getters/getMemberStatus");
const getChatSessionSettings = require("../functions/getters/getChatSessionSettings");
const getChatSession = require("../functions/getters/getChatSession");
const invertButtonCallbackData = require("../functions/keyboard/invertButtonCallbackData");
const setButtonText = require("../functions/keyboard/setButtonText");
const controlButtons = require("../functions/keyboard/controlButtons");

module.exports = [[/^settings\.[^.]+\.[0-1]+$/, function (session, callback) {
    const [, setting, flag] = callback.data.match(/^settings\.([^.]+)\.([0-1]+)$/);
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

    bot.editMessageText("Нажми на кнопку, чтобы включить или отключить функцию.", {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...controlButtons("settings", chatSession.settingsButtons, 1)]
        }
    });
}], [/^settings_[^.]+$/, function (session, callback) {
    let chatSession = getChatSession(callback.message.chat.id);
    if (!getMemberStatus(callback.message.chat.id, chatSession.settingsMessageId)) {
        return;
    }
    let [, page] = callback.data.match(/^settings_([^.]+)$/);
    page = parseInt(page);

    return bot.editMessageText("Нажми на кнопку, чтобы включить или отключить функцию.", {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...controlButtons("settings", chatSession.settingsButtons, page)]
        }
    });
}]];