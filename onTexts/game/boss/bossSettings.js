const buttonsDictionary = require('../../../dictionaries/buttons');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const getChatSession = require("../../../functions/getters/getChatSession");
const getChatSessionBossSettings = require("../../../functions/getters/getChatSessionBossSettings");

module.exports = [[/(?:^|\s)\/boss_settings\b/, async (msg) => {
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
    return sendMessage(msg.chat.id, `Глобальные настройки всех боссов в этом чате`, {
        reply_markup: {
            inline_keyboard: [...buttons, [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    })
}]];