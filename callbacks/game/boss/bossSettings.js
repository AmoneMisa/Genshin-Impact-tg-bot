const getChatSession = require("../../../functions/getters/getChatSession");
const getMemberStatus = require("../../../functions/getters/getMemberStatus");
const getChatSessionBossSettings = require("../../../functions/getters/getChatSessionBossSettings");
const invertButtonCallbackData = require("../../../functions/keyboard/invertButtonCallbackData");
const setButtonText = require("../../../functions/keyboard/setButtonText");
const editMessageText = require("../../../functions/tgBotFunctions/editMessageText");
const controlButtons = require("../../../functions/keyboard/controlButtons");

module.exports = [[/^bossSettings\.([^.]+)\.([0-1]+)$/, async function (session, callback, [, setting, flag]) {
    let chatSession = getChatSession(callback.message.chat.id);

    if (!getMemberStatus(callback.message.chat.id, chatSession.bossSettingsMessageId)) {
        return;
    }

    let settings = getChatSessionBossSettings(callback.message.chat.id);
    settings[setting] = parseInt(flag);

    for (const buttonLine of chatSession.bossSettingsButtons) {
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
            inline_keyboard: [...controlButtons("bossSettings", chatSession.bossSettingsButtons, 1)]
        }
    });
}], [/^bossSettings_([^.]+)$/, async function (session, callback, [, page]) {
    let chatSession = getChatSession(callback.message.chat.id);
    if (!getMemberStatus(callback.message.chat.id, chatSession.bossSettingsMessageId)) {
        return;
    }

    page = parseInt(page);

    await editMessageText("Нажми на кнопку, чтобы включить или отключить функцию.", {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...controlButtons("bossSettings", chatSession.bossSettingsButtons, page)]
        }
    });
}]]