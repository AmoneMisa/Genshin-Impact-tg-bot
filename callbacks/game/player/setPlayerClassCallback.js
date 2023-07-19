const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const changePlayerClass = require('../../../functions/game/player/changePlayerGameClass');
const getPlayerClass = require('../../../functions/game/player/getPlayerGameClass');
const getClassStatsFromTemplate = require('../../../functions/game/player/getGameClassStatsFromTemplate');
const getUserName = require('../../../functions/getters/getUserName');
const getTime = require("../../../functions/getters/getTime");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");
const getPlayerStatsMessage = require("../../../functions/game/player/getPlayerGameClassMessage");
const classes = require("../../../templates/classStatsTemplate");
const getEmoji = require('../../../functions/getters/getEmoji');
const bot = require('../../../bot');

function getOffset() {
    return new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
}

module.exports = [[/^player\.changeClass(?:\.back)?$/, function (session, callback) {
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    if (!session.hasOwnProperty("changeClassTimer")) {
        session.changeClassTimer = 0;
    }

    const isBack = callback.data === 'player.changeClass.back';

    let chatId = callback.message.chat.id;

    let info = "";
    let buttons = [];
    let tempArray = null;
    let i = 0;

    console.log("session", session.game.gameClass.stats.name);
    for (let _class of Object.values(classes)) {
        if (_class.name === "noClass") {
            continue;
        }

        if (_class.name === session.game.gameClass.stats.name) {
            continue;
        }

        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }
        tempArray.push({
            text: `${getEmoji(_class.name)} ${_class.translateName}`,
            callback_data: `player.changeClass.${_class.name}`
        });
        info += `${getEmoji(_class.name)} ${_class.translateName}: ${_class.description}\n\n`;
        i++;
    }

    if (isBack) {
        bot.editMessageText(`@${getUserName(session, "nickname")}, выбери свой класс.\nТвой текущий класс: ${session.game.gameClass.stats.translateName}\n\n${info}`, {
            chat_id: chatId,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [...buttons, [{text: "Закрыть", callback_data: "close"}]]
            }
        })
    } else {
        sendMessage(chatId, `@${getUserName(session, "nickname")}, выбери свой класс.\nТвой текущий класс: ${session.game.gameClass.stats.translateName}\n\n${info}`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [...buttons, [{text: "Закрыть", callback_data: "close"}]]
            }
        });
    }
}], [/^player\.changeClass\.[^.]+$/, function (session, callback) {
    const [, _class] = callback.data.match(/^player\.changeClass\.([^.]+)$/);

    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    let classTemplate = getClassStatsFromTemplate(_class);
    let info = `Информация о классе ${getEmoji(classTemplate.name)} ${classTemplate.translateName}\n\n${getPlayerStatsMessage(classTemplate, session.game.stats, session.game.effects)}\n`;

    bot.editMessageText(`${getUserName(session, "nickname")}, ${info}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Подтвердить смену",
                callback_data: `player.changeClass.${_class}.0`
            }], [{
                text: "Назад",
                callback_data: "player.changeClass"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], [/^player\.changeClass\.[^.]+\.0$/, function (session, callback) {
    const [, _class] = callback.data.match(/^player\.changeClass\.([^.]+)\.0$/);
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    let chatId = callback.message.chat.id;
    if (session.game.gameClass.stats.name !== "noClass") {
        let [remain] = getTime(session.changeClassTimer);
        if (remain > 0) {
            return sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, команду можно вызывать раз в неделю. Осталось: ${getStringRemainTime(remain)}`, {}, 10 * 1000);
        }
    }

    session.changeClassTimer = getOffset();

    let classStatsTemplate = getClassStatsFromTemplate(_class);
    changePlayerClass(session, classStatsTemplate);
    console.log(2, session.game.gameClass.stats.name);

    let {stats} = getPlayerClass(session.game.gameClass);
    console.log("stats", stats)
    bot.editMessageText(`@${getUserName(session, "nickname")}, ты успешно сменил класс на ${getEmoji(_class)} ${stats.translateName}`, {
        chat_id: chatId,
        message_id: callback.message.message_id,
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

