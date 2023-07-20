const getBuild = require("../../../functions/game/builds/getBuild");
const buttonsDictionary = require("../../../dictionaries/buttons");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const getCaption = require('../../../functions/game/builds/getCaption');
const setTimerForCollectResources = require('../../../functions/game/builds/setTimerForCollectResources');
const buildsTemplate = require("../../../templates/buildsTemplate");
const getSession = require("../../../functions/getters/getSession");
const editMessageCaption = require('../../../functions/tgBotFunctions/editMessageCaption');

module.exports = [[/^builds\.[\-0-9]+\.[^.]+\.collect$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.collect$/);
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let resourcesCount = Math.ceil(build.resourceCollected);

    let keyboard;
    if (resourcesCount > 0) {
        keyboard = [[{
            text: "Собрать",
            callback_data: `builds.${chatId}.${buildName}.collect.0`
        }], [{
            text: "Назад",
            callback_data: `builds.${chatId}.${buildName}.back`
        }], [{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];
    } else {
        keyboard = [[{
            text: "Назад",
            callback_data: `builds.${chatId}.${buildName}.back`
        }], [{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];
    }

    await editMessageCaption(getCaption(buildName, `collect.${resourcesCount > 0 ? 0 : 1}`, build), {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: keyboard
        }
    }, callback.message.photo);
}], [/^builds\.[\-0-9]+\.[^.]+\.collect\.0$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.collect\.0$/);
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (build.upgradeStartedAt) {
        return sendMessageWithDelete(callback.message.chat.id, "Вы не можете собирать ресурсы со здания, которое в данный момент улучшается", {}, 5000);
    }

    build.lastCollectAt = new Date().getTime();
    let foundedSession = await getSession(chatId, callback.from.id);

    let buildTemplate = buildsTemplate[buildName];
    let resourcesType = buildTemplate.resourcesType;
    foundedSession.game.inventory[resourcesType] += Math.ceil(build.resourceCollected);
    build.resourceCollected = 0;

    let maxWorkHoursWithoutCollection = buildTemplate.maxWorkHoursWithoutCollection;
    let defaultCollectionPerHour = buildTemplate.productionPerHour;
    setTimerForCollectResources(build, maxWorkHoursWithoutCollection, defaultCollectionPerHour);

    await editMessageCaption(getCaption(buildName, "home", build), {
        message_id: messageId,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: `builds.${chatId}.${buildName}.back`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}]];