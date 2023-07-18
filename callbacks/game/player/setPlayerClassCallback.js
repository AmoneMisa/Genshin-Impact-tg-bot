const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const changePlayerClass = require('../../../functions/game/player/changePlayerClass');
const getPlayerClass = require('../../../functions/game/player/getPlayerClass');
const getUserName = require('../../../functions/getters/getUserName');
const getTime = require("../../../functions/getters/getTime");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");
const getPlayerStatsMessage = require("../../../functions/game/player/getPlayerStatsMessage");
const classes = require("../../../templates/classStatsTemplate");
const getEmoji = require('../../../functions/getters/getEmoji');

function getOffset() {
    return new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
}

module.exports = [["player.changeClass", function (session, callback) {
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }
    if (!session.hasOwnProperty("changeClassTimer")) {
        session.changeClassTimer = 0;
    }

    let [remain] = getTime(session.changeClassTimer);
    let chatId = callback.message.chat.id;
    if (remain > 0) {
        return sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, команду можно вызывать раз в неделю. Осталось: ${getStringRemainTime(remain)}`, {}, 10 * 1000);
    }

    let info = "";

    let buttons = [];
    let tempArray = null;
    let i = 0;

    for (let [key, _class] of Object.entries(classes)) {
        if (_class.name === "noClass") {
            continue;
        }

        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }
        tempArray.push({text: `${getEmoji(_class.name)} ${_class.translateName}`, callback_data: `player.changeClass.${_class.name}`});
        info += `${getEmoji(_class.name)} ${_class.translateName}: ${_class.description}\n\n`;
        i++;
    }

    sendMessage(chatId, `@${getUserName(session, "nickname")}, выбери свой класс.\n\n${info}`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [...buttons, [{text: "Закрыть", callback_data: "close"}]]
        }
    });
}], [/^player.changeClass\.[^.]+$/, function (session, callback) {
    const [, _class] = callback.data.match(/^set_class\.([^.]+)$/);

    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }
    let info = `Информация о классе ${getEmoji(_class.name)} ${_class.translateName}\n\n${getPlayerStatsMessage(_class, session.game.stats, session.game.effects)}\n`;

    sendMessage(callback.message.chat.id, `${getUserName(session, "nickname")}, ${info}`, {
        reply_markup: {
            inline_keyboard: [[{
                text: "Подтвердить смену",
                callback_data: "player.changeClass.0"
            }], [{
                text: "Назад",
                callback_data: "player.changeClass"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], [/^player.changeClass\.[^.]\.0+$/, function (session, callback) {
    const [, _class] = callback.data.match(/^set_class\.([^.]+)\.0$/);

    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }
    session.changeClassTimer = getOffset();

    changePlayerClass(session, _class);
    let {stats} = getPlayerClass(session);

    sendMessage(callback.message.chat.id, `${getUserName(session, "nickname")}, ты успешно сменил класс на ${getEmoji(_class.name)} ${stats.translateName}`, {
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "player.changeClass"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}]];

