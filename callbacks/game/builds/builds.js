const sendPhoto = require('../../../functions/tgBotFunctions/sendPhoto');
const getUserName = require('../../../functions/getters/getUserName');
const getBuild = require('../../../functions/game/builds/getBuild');
const buildsTemplate = require('../../../templates/buildsTemplate');
const getLocalImageByPath = require("../../../functions/getters/getLocalImageByPath");
const buttonsDictionary = require("../../../dictionaries/buttons");
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const bot = require('../../../bot');

function getCaption(name, action, build) {
    let buildTemplate = buildsTemplate[name];

    switch (action) {
        case "home": return `${buildTemplate.name} - ${buildTemplate.description}`;
        case "upgrade": return `${buildTemplate.name} - улучшение здания.\n\nТекущий уровень: ${build.currentLvl}\nСтоимость улучшения на следующий уровень: `;
        case "status": return `${buildTemplate.name} - статус здания.\n\nТекущий уровень: ${build.currentLvl}\nТекущие характеристики:` ;
        case "collect.0": return `${buildTemplate.name} - собрать прибыль.\n\nПроизведено: .\nОсталось времени непрерывного производства: `;
        case "collect.1": return `${buildTemplate.name} - невозможно собрать прибыль.\n\nЕщё ничего не произведено.\nОсталось времени непрерывного производства: `;
        case "changeType": return `${buildTemplate.name} - Изменить внешний вид\n\nПо умолчанию, Вам доступен только стандартный вид, для получения других внешних видов, необходимо зайти в магазин через команду /shop.`;
        case "changeName": return `${buildTemplate.name} - Изменить название дворца`;
        case "guarded": return `${buildTemplate.name} - статус казны.\n\nНа данный момент под защитой: золота, руды, кристаллов.`;
        default: return `${buildTemplate.name} - ${buildTemplate.description}`;
    }
}

function getUpgradeButtonText(lvl) {
    if (lvl === 0) {
        return "Построить";
    }
    return "Улучшить";
}

module.exports = [[/^builds\.palace(?:\.back)?$/, async function (session, callback) {
    const isBack = callback.data ==='builds.palace.back';

    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    if (!session.game.hasOwnProperty('builds')) {
        return;
    }

    let chatId = callback.message.chat.id;
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'palace');

    if (isBack) {
        await bot.editMessageCaption(getCaption('palace', "home", build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Изменить тип",
                    callback_data: "builds.palace.changeType",
                },{
                    text: "Статус",
                    callback_data: "builds.palace.status",
                }],[{
                    text: "Улучшить",
                    callback_data: "builds.palace.upgrade",
                },{
                    text: "Статус казны",
                    callback_data: "builds.palace.guarded",
                }],[{
                    text: "Изменить название",
                    callback_data: "builds.palace.changeName",
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } else {
        let imageStream = getLocalImageByPath(build.currentLvl, `builds/palace/${build.type || 'common'}`);

        if (imageStream) {
            await sendPhoto(chatId, imageStream, {
                caption: getCaption('palace', "home", build), reply_markup: {
                    inline_keyboard: [[{
                        text: "Изменить тип",
                        callback_data: "builds.palace.changeType",
                    },{
                        text: "Статус",
                        callback_data: "builds.palace.status",
                    }],[{
                        text: "Улучшить",
                        callback_data: "builds.palace.upgrade",
                    },{
                        text: "Статус казны",
                        callback_data: "builds.palace.guarded",
                    }],[{
                        text: "Изменить название",
                        callback_data: "builds.palace.changeName",
                    }], [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            });
        }
    }
}], [/^builds\.goldMine(?:\.back)?$/, async function (session, callback) {
    const isBack = callback.data ==='builds.goldMine.back';

    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    if (!session.game.hasOwnProperty('builds')) {
        return;
    }

    let chatId = callback.message.chat.id;
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'goldMine');

    if (isBack) {
        await bot.editMessageCaption(getCaption('goldMine', "home", build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Статус",
                    callback_data: "builds.goldMine.status",
                }, {
                    text: "Улучшить",
                    callback_data: "builds.goldMine.upgrade",
                }],[{
                    text: "Собрать прибыть",
                    callback_data: "builds.goldMine.collect",
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } else {
        let imageStream = getLocalImageByPath(build.currentLvl, 'builds/goldMine');

        await sendPhoto(chatId, imageStream, {
            caption: getCaption('goldMine', "home", build), reply_markup: {
                inline_keyboard: [[{
                    text: "Статус",
                    callback_data: "builds.goldMine.status",
                }, {
                    text: "Улучшить",
                    callback_data: "builds.goldMine.upgrade",
                }],[{
                    text: "Собрать прибыть",
                    callback_data: "builds.goldMine.collect",
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        })
    }
}],[/^builds.crystalLake(?:\.back)?$/, async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }
    const isBack = callback.data ==='builds.crystalLake.back';


    if (!session.game.hasOwnProperty('builds')) {
        return;
    }

    let chatId = callback.message.chat.id;
    let messageId = callback.message.message_id;

    let build = getBuild(chatId, callback.from.id, 'crystalLake');

    if (isBack) {
        await bot.editMessageCaption(getCaption('crystalLake', "home", build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Статус",
                    callback_data: "builds.crystalLake.status",
                }, {
                    text: getUpgradeButtonText(build.currentLvl),
                    callback_data: "builds.crystalLake.upgrade",
                }],[{
                    text: "Собрать прибыть",
                    callback_data: "builds.crystalLake.collect",
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } else {
        let imageStream = getLocalImageByPath(build.currentLvl, 'builds/crystalLake');

        await sendPhoto(chatId, imageStream, {
            caption: getCaption('crystalLake', "home", build), reply_markup: {
                inline_keyboard: [[{
                    text: "Статус",
                    callback_data: "builds.crystalLake.status",
                }, {
                    text: getUpgradeButtonText(build.currentLvl),
                    callback_data: "builds.crystalLake.upgrade",
                }],[{
                    text: "Собрать прибыть",
                    callback_data: "builds.crystalLake.collect",
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        })
    }
}],[/^builds.ironDeposit(?:\.back)?$/, async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    const isBack = callback.data ==='builds.ironDeposit.back';

    if (!session.game.hasOwnProperty('builds')) {
        return;
    }

    let chatId = callback.message.chat.id;
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'ironDeposit');
    if (isBack) {
        await bot.editMessageCaption(getCaption('crystalLake', "home", build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Статус",
                    callback_data: "builds.ironDeposit.status",
                }, {
                    text: getUpgradeButtonText(build.currentLvl),
                    callback_data: "builds.ironDeposit.upgrade",
                }], [{
                    text: "Собрать прибыть",
                    callback_data: "builds.ironDeposit.collect",
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } else {
        let imageStream = getLocalImageByPath(build.currentLvl, 'builds/ironDeposit');

        await sendPhoto(chatId, imageStream, {
            caption: getCaption('ironDeposit', "home", build), reply_markup: {
                inline_keyboard: [[{
                    text: "Статус",
                    callback_data: "builds.ironDeposit.status",
                }, {
                    text: getUpgradeButtonText(build.currentLvl),
                    callback_data: "builds.ironDeposit.upgrade",
                }], [{
                    text: "Собрать прибыть",
                    callback_data: "builds.ironDeposit.collect",
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        })
    }
}], [/^builds\.[^.]+\.status$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.status$/);
    let chatId = callback.message.chat.id;
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    try {
        await bot.editMessageCaption(getCaption(buildName, "status", build), {
            chat_id: chatId,
            message_id: messageId,
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
    } catch (e) {
        debugMessage(`${chatId} - builds.${build}.status - ошибка редактирования заголовка - статус`);
    }
}], [/^builds\.[^.]+\.upgrade$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    let keyboard;
    // условие: если достаточно ресурсов для улучшения, показывать кнопку "улучшить", если нет - не показывать.
    // Если улучшение уже в процессе - добавить кнопку "ускорить улучшение" и изменить заголовок на "Вы уверены?" и цену улучшения

    try {
        await bot.editMessageCaption(getCaption(buildName, "upgrade", build), {
            chat_id: chatId,
            message_id: messageId,
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
    } catch (e) {
        debugMessage(`${chatId} - builds.${build}.upgrade - ошибка редактирования заголовка`);
    }
}], [/^builds\.[^.]+\.changeType$/, async function (session, callback) {
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
                }],[{
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
    session.game.builds[buildName].type = typeName;

    try {
        let imageStream = getLocalImageByPath(build.currentLvl, `builds/${buildName}/${typeName}`);
        await bot.deleteMessage(chatId, messageId);

        if (imageStream) {
            await sendPhoto(chatId, imageStream,{
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
}], [/^builds\.[^.]+\.collect$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.collect$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let resourcesCount = build.resources;

    let keyboard;
    if (resourcesCount > 0) {
        keyboard = [[{
            text: "",
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
    // условие: если достаточно ресурсов для улучшения, показывать кнопку "улучшить", если нет - не показывать.
    // Если улучшение уже в процессе - добавить кнопку "ускорить улучшение" и изменить заголовок на "Вы уверены?" и цену улучшения

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
}]];