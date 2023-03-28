const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const bot = require('../bot');
const debugMessage = require('../functions/tgBotFunctions/debugMessage');
const getMemberStatus = require("../functions/getters/getMemberStatus");
const getChatSession = require("../functions/getters/getChatSession");
const getChatSessionSettings = require("../functions/getters/getChatSessionSettings");
const controlButtons = require("../functions/keyboard/controlButtons");

module.exports = [[/(?:^|\s)\/settings\b/, async (msg) => {
    try {
        if (!getMemberStatus(msg.chat.id, msg.from.id)) {
            return;
        }

        let chatSession = getChatSession(msg.chat.id);
        chatSession.settingsMessageId = msg.from.id;

        const buttons = [[{
            text: "Анкеты",
            callback_data: "settings.form"
        }, {
            text: "Босс",
            callback_data: "settings.boss"
        }, {
            text: "Кубики",
            callback_data: "settings.dice"
        }], [{
            text: "21 очко",
            callback_data: "settings.points"
        }, {
            text: "Слоты",
            callback_data: "settings.slots"
        }, {
            text: "Титулы",
            callback_data: "settings.titles"
        }], [{
            text: "Мечи",
            callback_data: "settings.swords"
        }, {
            text: "Сундуки",
            callback_data: "settings.chest"
        }, {
            text: "Само-мут",
            callback_data: "settings.mute"
        }], [{
            text: "Свой статус",
            callback_data: "settings.whoami"
        }, {
            text: "Перевод золота",
            callback_data: "settings.sendGold"
        }]];

        let settings = getChatSessionSettings(msg.chat.id);
        for (const buttonLine of buttons) {
            for (const button of buttonLine) {
                let flag = settings[button.callback_data.replace(/^settings\./, '')];
                button.callback_data += `.${flag === 1 ? 0 : 1}`;
                button.text += flag === 1 ? " | (Вкл)" : " | (Выкл)";
            }
        }

        chatSession.settingsButtons = buttons;

        bot.deleteMessage(msg.chat.id, msg.message_id);
        sendMessage(msg.chat.id, "Нажми на кнопку, чтобы включить или отключить функцию.", {
                reply_markup: {
                    inline_keyboard: [...controlButtons("settings", chatSession.settingsButtons, 1)]
                }
            }
        );
    } catch (e) {
        debugMessage(`Command: /settings\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];