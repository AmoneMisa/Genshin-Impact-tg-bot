import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import getMemberStatus from '../functions/getters/getMemberStatus.js';
import getChatSession from '../functions/getters/getChatSession.js';
import getChatSessionSettings from '../functions/getters/getChatSessionSettings.js';
import controlButtons from '../functions/keyboard/controlButtons.js';
import deleteMessage from '../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/settings\b/, async (msg) => {
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
    }], [{
        text: "Боулинг",
        callback_data: "settings.bowling"
    }, {
        text: "Дартс",
        callback_data: "settings.darts"
    }, {
        text: "Баскетбол",
        callback_data: "settings.basketball"
    }], [{
        text: "Футбол",
        callback_data: "settings.football"
    }, {
        text: "Элементы",
        callback_data: "settings.elements"
    }], [{
        text: "Гороскоп",
        callback_data: "settings.horoscope"
    }, {
        text: "Бонус",
        callback_data: "settings.bonus"
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
    await deleteMessage(msg.chat.id, msg.message_id);
    await sendMessage(msg.chat.id, "Нажми на кнопку, чтобы включить или отключить функцию.", {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        reply_markup: {
                inline_keyboard: [...controlButtons("settings", chatSession.settingsButtons, 1)]
            }
        }
    );
}]];