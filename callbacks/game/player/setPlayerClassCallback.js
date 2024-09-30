const editMessageCaption = require('../../../functions/tgBotFunctions/editMessageCaption');
const editMessageMedia = require('../../../functions/tgBotFunctions/editMessageMedia');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const changePlayerClass = require('../../../functions/game/player/changePlayerGameClass');
const getPlayerGameClass = require('../../../functions/game/player/getters/getPlayerGameClass');
const getClassStatsFromTemplate = require('../../../functions/game/player/getters/getGameClassStatsFromTemplate');
const getUserName = require('../../../functions/getters/getUserName');
const getTime = require("../../../functions/getters/getTime");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");
const getPlayerGameClassMessage = require("../../../functions/game/player/getters/getPlayerGameClassMessage");
const classes = require("../../../template/classStatsTemplate");
const getEmoji = require('../../../functions/getters/getEmoji');
const getSession = require('../../../functions/getters/getSession');
const checkUserCall = require("../../../functions/misc/checkUserCall");
const updatePlayerStats = require("../../../functions/game/player/updatePlayerStats");
const getFile = require("../../../functions/getters/getFile");

function getOffset() {
    return new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
}

module.exports = [[/^player\.([\-0-9]+)\.changeClass(?:\.back)?$/, async function (session, callback, [, chatId]) {
    if (!checkUserCall(callback, session)) {
        return;
    }

    const foundedSession = await getSession(chatId, callback.from.id);

    if (!foundedSession.hasOwnProperty("changeClassTimer")) {
        foundedSession.changeClassTimer = 0;
    }

    const isBack = callback.data.includes("back");
    let info = "";
    let buttons = [];
    let tempArray = null;
    let i = 0;

    for (let _class of Object.values(classes)) {
        if (_class.name === "noClass") {
            continue;
        }

        if (_class.name === foundedSession.game.gameClass.stats.name) {
            continue;
        }

        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }
        tempArray.push({
            text: `${getEmoji(_class.name)} ${_class.translateName}`,
            callback_data: `player.${chatId}.changeClass.${_class.name}`
        });
        info += `${getEmoji(_class.name)} ${_class.translateName}: ${_class.description}\n\n`;
        i++;
    }

    if (isBack) {
        return editMessageCaption(`@${getUserName(foundedSession, "nickname")}, выбери свой класс.\nТвой текущий класс: ${foundedSession.game.gameClass.stats.translateName}\n\n${info}`, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [...buttons, [{
                    text: "Главная",
                    callback_data: `player.${chatId}.whoami`
                }], [{text: "Закрыть", callback_data: "close"}]]
            }
        }, callback.message.photo);
    } else {
        let className = foundedSession.game.gameClass.stats.name || "noClass";
        let gender = foundedSession.gender || "male";
        const file = getFile(`images/classes/${className}/${gender}`, className);

        await editMessageMedia(file, `@${getUserName(foundedSession, "nickname")}, выбери свой класс.\nТвой текущий класс: ${foundedSession.game.gameClass.stats.translateName}\n\n${info}`, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [...buttons, [{text: "Закрыть", callback_data: "close"}]]
            }
        });

    }
}], [/^player\.([\-0-9]+)\.changeClass\.([^.]+)$/, async function (session, callback, [, userId, _class]) {
    if (!checkUserCall(callback, session)) {
        return;
    }

    const foundedSession = await getSession(userId, callback.from.id);
    let classTemplate = getClassStatsFromTemplate(_class, foundedSession.game.stats.lvl);
    let info = `Информация о классе ${getEmoji(classTemplate.name)} ${classTemplate.translateName}\n\n${getPlayerGameClassMessage(foundedSession, foundedSession.game.stats, foundedSession.game.effects, classTemplate)}\n`;

    return editMessageCaption(`${getUserName(foundedSession, "nickname")}, ${info}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Подтвердить смену",
                callback_data: `player.${userId}.changeClass.${_class}.0`
            }], [{
                text: "Главная",
                callback_data: `player.${userId}.whoami`
            }], [{
                text: "Назад",
                callback_data: `player.${userId}.changeClass.back`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.changeClass\.([^.]+)\.0$/, async function (session, callback, [, chatId, _class]) {
    if (!checkUserCall(callback, session)) {
        return;
    }

    const foundedSession = await getSession(chatId, callback.from.id);

    if (foundedSession.game.gameClass.stats.name !== "noClass") {
        let [remain] = getTime(foundedSession.changeClassTimer);
        if (remain > 0) {
            return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, команду можно вызывать раз в неделю. Осталось: ${getStringRemainTime(remain)}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 10 * 1000);
        }
    }

    foundedSession.changeClassTimer = getOffset();

    let classStatsTemplate = getClassStatsFromTemplate(_class);
    changePlayerClass(foundedSession, classStatsTemplate);
    updatePlayerStats(foundedSession);

    let {stats} = getPlayerGameClass(foundedSession.game.gameClass);
    let gender = session.gender || "male";
    let file = getFile(`images/classes/${_class}/${gender}`, _class);

    return editMessageMedia(file, `@${getUserName(foundedSession, "nickname")}, ты успешно сменил класс на ${getEmoji(_class)} ${stats.translateName}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Главная",
                callback_data: `player.${chatId}.whoami`
            }], [{
                text: "Назад",
                callback_data: `player.${chatId}.changeClass.back`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}]];

