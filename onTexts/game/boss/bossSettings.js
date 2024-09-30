import buttonsDictionary from '../../../dictionaries/buttons.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getChatSession from '../../../functions/getters/getChatSession.js';
import getChatSessionBossSettings from '../../../functions/getters/getChatSessionBossSettings.js';

export default [[/(?:^|\s)\/boss_settings\b/, async (msg) => {
    let chatId = msg.chat.id;
    let chatSession = getChatSession(chatId);
    await deleteMessage(chatId, msg.message_id);
    chatSession.bossSettingsMessageId = msg.from.id;

    let buttons = [[{
        text: "Показ сообщения об уроне",
        callback_data: `bossSettings.showDamageMessage`
    }], [{
        text: "Показ сообщения об отхиле",
        callback_data: `bossSettings.showHealMessage`
    }]];

    let settings = getChatSessionBossSettings(msg.chat.id);

    for (const buttonLine of buttons) {
        for (const button of buttonLine) {
            let flag = settings[button.callback_data.replace(/^bossSettings\./, '')];
            button.callback_data += `.${flag === 1 ? 0 : 1}`;
            button.text += flag === 1 ? " | (Вкл)" : " | (Выкл)";
        }
    }

    chatSession.bossSettingsButtons = buttons;
    await sendMessage(msg.chat.id, `Глобальные настройки всех боссов в этом чате`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        reply_markup: {
            inline_keyboard: [...buttons, [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    })
}]];