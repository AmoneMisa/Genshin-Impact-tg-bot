const getBuild = require("../../../functions/game/builds/getBuild");
const buttonsDictionary = require("../../../dictionaries/buttons");
const bot = require("../../../bot");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const getCaption = require('../../../functions/game/builds/getCaption');
const setTimerForCollectResources = require('../../../functions/game/builds/setTimerForCollectResources');
const buildsTemplate = require("../../../templates/buildsTemplate");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");

module.exports = [[/^builds\.[^.]+\.collect$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.collect$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let resourcesCount = Math.ceil(build.resourceCollected);

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

    if (callback.message.photo) {
        await bot.editMessageCaption(getCaption(buildName, `collect.${resourcesCount > 0 ? 0 : 1}`, build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } else {
        await sendMessage(chatId, getCaption(buildName, `collect.${resourcesCount > 0 ? 0 : 1}`, build), {
            reply_markup: {
                inline_keyboard: keyboard
            }
        })
    }
}], [/^builds\.[^.]+\.collect\.0$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.collect\.0$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (build.upgradeStartedAt) {
        return sendMessageWithDelete(chatId, "Вы не можете собирать ресурсы со здания, которое в данный момент улучшается", {}, 5000);
    }

    build.lastCollectAt = new Date().getTime();

    let buildTemplate = buildsTemplate[buildName];
    let resourcesType = buildTemplate.resourcesType;
    session.game.inventory[resourcesType] += Math.ceil(build.resourceCollected);
    build.resourceCollected = 0;

    let maxWorkHoursWithoutCollection = buildTemplate.maxWorkHoursWithoutCollection;
    let defaultCollectionPerHour = buildTemplate.productionPerHour;
    setTimerForCollectResources(build, maxWorkHoursWithoutCollection, defaultCollectionPerHour);

    if (callback.message.photo) {
        await bot.editMessageCaption(getCaption(buildName, "home", build), {
            message_id: messageId,
            chat_id: chatId,
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
    } else {
        await sendMessage(chatId, getCaption(buildName, "home", build), {
            reply_markup: {
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Назад",
                        callback_data: `builds.${buildName}.back`
                    }], [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            }
        })
    }
}]];