const getBuild = require("../../../functions/game/builds/getBuild");
const bot = require("../../../bot");
const buttonsDictionary = require("../../../dictionaries/buttons");
const debugMessage = require("../../../functions/tgBotFunctions/debugMessage");
const getLocalImageByPath = require("../../../functions/getters/getLocalImageByPath");
const sendPhoto = require("../../../functions/tgBotFunctions/sendPhoto");
const buildsTemplate = require("../../../templates/buildsTemplate");
const getCaption = require('../../../functions/game/builds/getCaption');

module.exports = [[/^builds\.[^.]+\.changeType$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.changeType$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let types = buildsTemplate[buildName].availableTypes;

    let buttons = [];
    let tempArray = null;
    let i = 0;

    if (Object.entries(types).length) {
        for (let [key, type] of Object.entries(types)) {

            if (build.type === key) {
                continue;
            }

            if (i % 3 === 0) {
                tempArray = [];
                buttons.push(tempArray);
            }

            tempArray.push({text: type.name, callback_data: `builds.${buildName}.changeType.${key}`});
            i++;
        }
    }

    buttons.push([{
        text: "Назад",
        callback_data: `builds.${buildName}.back`
    }], [{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]);

    try {
        await bot.editMessageCaption(getCaption(buildName, "changeType", build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    } catch (e) {
        debugMessage(`${chatId} - builds.${buildName}.upgrade - ошибка редактирования заголовка`);
    }
}], [/^builds\.[^.]+\.changeType\.[^.]+$/, async function (session, callback) {
    const [, buildName, typeName] = callback.data.match(/^builds\.([^.]+)\.changeType\.([^.]+)$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    try {
        await bot.editMessageCaption(getCaption(buildName, "changeType", build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Подтвердить смену",
                    callback_data: `builds.${buildName}.changeType.${typeName}.0`
                }], [{
                    text: "Назад",
                    callback_data: `builds.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`${chatId} - builds.${buildName}.changeType.${typeName} - ошибка редактирования заголовка`);
    }
}], [/^builds\.[^.]+\.changeType\.[^.]+\.0$/, async function (session, callback) {
    const [, buildName, typeName] = callback.data.match(/^builds\.([^.]+)\.changeType\.([^.]+)\.0$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    build.type = typeName;

    try {
        let imageStream = getLocalImageByPath(build.currentLvl, `builds/${buildName}/${typeName}`);
        await bot.deleteMessage(chatId, messageId);

        if (imageStream) {
            await sendPhoto(chatId, imageStream, {
                caption: getCaption(buildName, "home", build),
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Назад",
                        callback_data: `builds.${buildName}.back`
                    }], [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            });
        }
    } catch (e) {
        debugMessage(`${chatId} - builds.${buildName}.changeType.${typeName}.0 - ошибка редактирования изображения`);
    }
}]];