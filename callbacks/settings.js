import getMemberStatus from '../functions/getters/getMemberStatus.js';
import getChatSession from '../functions/getters/getChatSession.js';
import ChatSettings from '../db/models/ChatSettings.js';
import invertButtonCallbackData from '../functions/keyboard/invertButtonCallbackData.js';
import setButtonText from '../functions/keyboard/setButtonText.js';
import controlButtons from '../functions/keyboard/controlButtons.js';
import editMessageText from '../functions/tgBotFunctions/editMessageText.js';

export default [[/^settings\.([^.]+)\.([0-1]+)$/, async function (session, callback, [, setting, flag]) {
    let chatSession = await getChatSession(callback.message.chat.id);
    if (!await getMemberStatus(callback.message.chat.id, callback.from.id)) {
        return;
    }

    await ChatSettings.updateOne(
        { chatId: callback.message.chat.id },
        { $set: { [`settings.${setting}`]: parseInt(flag) } },
        { upsert: true }
    );

    for (const buttonLine of chatSession.settingsButtons) {
        for (const button of buttonLine) {
            if (button.callback_data === callback.data) {
                button.callback_data = invertButtonCallbackData(button.callback_data);
                button.text = setButtonText(button.text, flag);
            }
        }
    }

    chatSession.markModified("settingsButtons");
    await chatSession.save();

    await editMessageText("Нажми на кнопку, чтобы включить или отключить функцию.", {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...controlButtons("settings", chatSession.settingsButtons, 1)]
        }
    });
}], [/^settings_([^.]+)$/, async function (session, callback, [, page]) {
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
            inline_keyboard: [...controlButtons("settings", chatSession.settingsButtons, page)]
        }
    });
}]];