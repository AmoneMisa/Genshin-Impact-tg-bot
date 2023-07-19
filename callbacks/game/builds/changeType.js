const getBuild = require("../../../functions/game/builds/getBuild");
const bot = require("../../../bot");
const buttonsDictionary = require("../../../dictionaries/buttons");
const debugMessage = require("../../../functions/tgBotFunctions/debugMessage");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const getLocalImageByPath = require("../../../functions/getters/getLocalImageByPath");
const sendPhoto = require("../../../functions/tgBotFunctions/sendPhoto");
const buildsTemplate = require("../../../templates/buildsTemplate");
const getCaption = require('../../../functions/game/builds/getCaption');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

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

    await bot.editMessageCaption(getCaption(buildName, "changeType", build), {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: buttons
        }
    });
}], [/^builds\.[^.]+\.changeType\.[^.]+$/, async function (session, callback) {
    const [, buildName, typeName] = callback.data.match(/^builds\.([^.]+)\.changeType\.([^.]+)$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    if (!session.game.builds[buildName].availableTypes) {
        session.game.builds[buildName].availableTypes = Object.entries(buildsTemplate[buildName].availableTypes)
            .filter(([key, value]) => !value.isPayment)
            .map(([key, value]) => key);
    }

    if (!session.game.builds[buildName].availableTypes.includes(typeName)) {
        return sendMessageWithDelete(chatId, "У тебя нет этого типа здания в наличии. Чтобы его получить, зайди в магазин: /shop", {}, 5 * 1000);
    }

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
}], [/^builds\.[^.]+\.changeType\.[^.]+\.0$/, async function (session, callback) {
    const [, buildName, typeName] = callback.data.match(/^builds\.([^.]+)\.changeType\.([^.]+)\.0$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    build.type = typeName;

    try {
        let imagePath = getLocalImageByPath(build.currentLvl, `builds/${buildName}/${typeName}`);
        deleteMessage(chatId, messageId);

        if (imagePath) {
            await sendPhoto(chatId, imagePath, {
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