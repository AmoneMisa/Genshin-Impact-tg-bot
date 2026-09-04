import getChatSession from '../../../functions/getters/getChatSession.js';
import getMemberStatus from '../../../functions/getters/getMemberStatus.js';
import invertButtonCallbackData from '../../../functions/keyboard/invertButtonCallbackData.js';
import setButtonText from '../../../functions/keyboard/setButtonText.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';

export default [[/^bossSettings\.([^.]+)\.([0-1]+)$/, async function (session, callback, [, setting, flag]) {
    let chatSession = await getChatSession(callback.message.chat.id);

    if (!await getMemberStatus(callback.message.chat.id, callback.from.id)) {
        return;
    }

    if (!chatSession.bossSettings) {
        chatSession.bossSettings = {
            bossDealDamageMessage: 1,
            showHealMessage: 1
        };
    }
    chatSession.bossSettings[setting] = parseInt(flag);

    for (const buttonLine of chatSession.bossSettingsButtons) {
        for (const button of buttonLine) {
            if (button.callback_data === callback.data) {
                button.callback_data = invertButtonCallbackData(button.callback_data);
                button.text = setButtonText(button.text, flag);
            }
        }
    }

    chatSession.markModified("bossSettings");
    chatSession.markModified("bossSettingsButtons");
    await chatSession.save();

    await editMessageText("Нажми на кнопку, чтобы включить или отключить функцию.", {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...controlButtons("bossSettings", chatSession.bossSettingsButtons, 1)]
        }
    });
}], [/^bossSettings_([^.]+)$/, async function (session, callback, [, page]) {
    let chatSession = await getChatSession(callback.message.chat.id);
    if (!await getMemberStatus(callback.message.chat.id, callback.from.id)) {
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