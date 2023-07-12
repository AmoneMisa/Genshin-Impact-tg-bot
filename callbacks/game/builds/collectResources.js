const getBuild = require("../../../functions/game/builds/getBuild");
const buttonsDictionary = require("../../../dictionaries/buttons");
const bot = require("../../../bot");
const debugMessage = require("../../../functions/tgBotFunctions/debugMessage");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const getLocalImageByPath = require("../../../functions/getters/getLocalImageByPath");
const getCaption = require('../../../functions/game/builds/getCaption');
const setTimerForCollectResources = require('../../../functions/game/builds/setTimerForCollectResources');
const buildsTemplate = require( "../../../templates/buildsTemplate");

module.exports = [[/^builds\.[^.]+\.collect$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.collect$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let resourcesCount = build.resources;

    let keyboard;
    if (resourcesCount > 0) {
        keyboard = [[{
            text: "Собрать",
            callback_data: `builds.${buildName}.collect.0`
        }], [{
            text: "Назад",
            callback_data: `builds.${buildName}.back`
        }], [{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];
    } else {
        keyboard = [[{
            text: "Назад",
            callback_data: `builds.${buildName}.back`
        }], [{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];
    }

    try {
        await bot.editMessageCaption(getCaption(buildName, `collect.${resourcesCount > 0 ? 0 : 1}`, build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (e) {
        debugMessage(`${chatId} - builds.${build}.upgrade - ошибка редактирования заголовка`);
    }
}], [/^builds\.[^.]+\.collect\.[^.]+\.0$/, async function (session, callback) {
    const [, buildName, typeName] = callback.data.match(/^builds\.([^.]+)\.collect\.([^.]+)\.0$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (build.upgradeStartedAt) {
        return sendMessageWithDelete(chatId, "Вы не можете собирать ресурсы со здания, которое в данный момент улучшается", {}, 5000);
    }

    let buildTemplate = buildsTemplate[buildName];
    let resourcesType =  buildTemplate.resources.type;
    session.game.inventory[resourcesType] += build.resourceCollected;
    build.resourceCollected = 0;

    let maxWorkHoursWithoutCollection = buildTemplate.maxWorkHoursWithoutCollection;
    let defaultCollectionPerHour = buildTemplate.productionPerHour;
    setTimerForCollectResources(build, maxWorkHoursWithoutCollection, defaultCollectionPerHour);

    try {
        let imageStream = getLocalImageByPath(build.currentLvl, `builds/${buildName}/${typeName}`);
        await bot.deleteMessage(chatId, messageId);

        if (imageStream) {
            await bot.editMessageCaption(getCaption(buildName, "home", build,),{
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
        debugMessage(`${chatId} - builds.${buildName}.collect.${typeName}.0 - ошибка редактирования заголовка`);
    }
}]];