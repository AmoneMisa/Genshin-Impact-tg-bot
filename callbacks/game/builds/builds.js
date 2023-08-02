const sendPhoto = require('../../../functions/tgBotFunctions/sendPhoto');
const editMessageCaption = require('../../../functions/tgBotFunctions/editMessageCaption');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getUserName = require('../../../functions/getters/getUserName');
const getBuild = require('../../../functions/game/builds/getBuild');
const getCaption = require('../../../functions/game/builds/getCaption');
const getLocalImageByPath = require("../../../functions/getters/getLocalImageByPath");
const buttonsDictionary = require("../../../dictionaries/buttons");
const getBuildList = require("../../../functions/game/builds/getBuildList");
const getBuildListFromTemplate = require("../../../functions/game/builds/getBuildFromTemplate");
const buildsTemplate = require("../../../templates/buildsTemplate");
const getSession = require("../../../functions/getters/getSession");
const getFile = require("../../../functions/getters/getFile");
const checkUserCall = require("../../../functions/misc/checkUserCall");
const editMessageMedia = require("../../../functions/tgBotFunctions/editMessageMedia");

function getUpgradeButtonText(lvl) {
    if (lvl === 0) {
        return "Построить";
    }
    return "Улучшить";
}

module.exports = [[/^player\.([\-0-9]+)\.builds$/, async function (session, callback, [, chatId]) {
    let id;
    let foundedSession = await getSession(chatId, callback.from.id);
    let userId = foundedSession.userChatData.user.id;
    let buildsList = await getBuildList(chatId, userId);
    let defaultBuilds = getBuildListFromTemplate();

    for (let [key, build] of Object.entries(defaultBuilds)) {
        if (buildsList[key]) {
            continue;
        }

        buildsList[key] = build;
    }

    let buttons = [];
    let tempArray = null;
    let i = 0;

    if (Object.entries(buildsList).length) {
        for (let key of Object.keys(buildsList)) {
            if (i % 3 === 0) {
                tempArray = [];
                buttons.push(tempArray);
            }

            tempArray.push({text: buildsTemplate[key].name, callback_data: `builds.${chatId}.${key}`});
            i++;
        }
    }

    buttons.push([{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]);

    const file = getFile("images/misc", "builds");

    if (file) {
        await sendPhoto(userId, file, {
            caption: `@${getUserName(session, "nickname")}, выбери здание, с которым хочешь взаимодействовать`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: buttons
            }
        }).then(message => id = message.message_id);
    } else {
        await sendMessage(userId, `@${getUserName(session, "nickname")}, выбери здание, с которым хочешь взаимодействовать`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: buttons
            }
        }).then(message => id = message.message_id);
    }
}], [/^builds\.([\-0-9]+)\.palace(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");
    let foundedSession = await getSession(chatId, callback.from.id);

    if (!foundedSession.game.hasOwnProperty('builds')) {
        return;
    }

    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'palace');
    let keyboard = [[{
        text: "Изменить тип",
        callback_data: `builds.${chatId}.palace.changeType`,
    }, {
        text: "Статус",
        callback_data: `builds.${chatId}.palace.status`,
    }], [{
        text: "Улучшить",
        callback_data: `builds.${chatId}.palace.upgrade`,
    }, {
        text: "Статус казны",
        callback_data: `builds.${chatId}.palace.guarded`,
    }], [{
        text: "Изменить название",
        callback_data: `builds.${chatId}.palace.changeName`,
    }], [{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]];

    if (isBack) {
        await editMessageCaption(getCaption('palace', "home", build), {
            chat_id: callback.message.chat.id,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: keyboard
            }
        }, callback.message.photo);
    } else {
        let imagePath = getLocalImageByPath(build.currentLvl, `builds/palace/${build.type || 'common'}`);

        if (imagePath) {
            await sendPhoto(callback.message.chat.id, imagePath, {
                caption: getCaption('palace', "home", build), reply_markup: {
                    inline_keyboard: keyboard
                }
            });
        } else {
            await sendMessage(callback.message.chat.id, getCaption('palace', "home", build), {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        }
    }
}], [/^builds\.([\-0-9]+)\.goldMine(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");

    if (!checkUserCall(callback, session)) {
        return;
    }

    let foundedSession = await getSession(chatId, callback.from.id);

    if (!foundedSession.game.hasOwnProperty('builds')) {
        return;
    }

    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'goldMine');
    let keyboard = [[{
        text: "Статус",
        callback_data: `builds.${chatId}.goldMine.status`,
    }, {
        text: "Улучшить",
        callback_data: `builds.${chatId}.goldMine.upgrade`,
    }], [{
        text: "Собрать прибыть",
        callback_data: `builds.${chatId}.goldMine.collect`,
    }], [{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]];
    if (isBack) {
        await editMessageCaption(getCaption('goldMine', "home", build), {
            chat_id: callback.message.chat.id,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: keyboard
            }
        }, callback.message.photo);
    } else {
        let imagePath = getLocalImageByPath(build.currentLvl, 'builds/goldMine');

        if (imagePath) {
            await sendPhoto(callback.message.chat.id, imagePath, {
                caption: getCaption('goldMine', "home", build), reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        } else {
            await sendMessage(callback.message.chat.id, getCaption('goldMine', "home", build), {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        }
    }
}], [/^builds\.([\-0-9]+)\.crystalLake(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");

    if (!session.game.hasOwnProperty('builds')) {
        return;
    }

    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'crystalLake');
    let keyboard = [[{
        text: "Статус",
        callback_data: `builds.${chatId}.crystalLake.status`,
    }, {
        text: getUpgradeButtonText(build.currentLvl),
        callback_data: `builds.${chatId}.crystalLake.upgrade`,
    }], [{
        text: "Собрать прибыть",
        callback_data: `builds.${chatId}.crystalLake.collect`,
    }], [{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]];

    if (isBack) {
        await editMessageCaption(getCaption('crystalLake', "home", build), {
            chat_id: callback.message.chat.id,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: keyboard
            }
        }, callback.message.photo);
    } else {
        let imagePath = getLocalImageByPath(build.currentLvl, 'builds/crystalLake');

        if (imagePath) {
            await sendPhoto(callback.message.chat.id, imagePath, {
                caption: getCaption('crystalLake', "home", build), reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        } else {
            await sendMessage(callback.message.chat.id, getCaption('crystalLake', "home", build), {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        }
    }
}], [/^builds\.([\-0-9]+)\.ironDeposit(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");
    let foundedSession = await getSession(chatId, callback.from.id);

    if (!foundedSession.game.hasOwnProperty('builds')) {
        return;
    }

    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'ironDeposit');
    let keyboard = [[{
        text: "Статус",
        callback_data: `builds.${chatId}.ironDeposit.status`,
    }, {
        text: getUpgradeButtonText(build.currentLvl),
        callback_data: `builds.${chatId}.ironDeposit.upgrade`,
    }], [{
        text: "Собрать прибыть",
        callback_data: `builds.${chatId}.ironDeposit.collect`,
    }], [{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]];

    if (isBack) {
        await editMessageCaption(getCaption('ironDeposit', "home", build), {
            chat_id: callback.message.chat.id,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: keyboard
            }
        }, callback.message.photo);
    } else {
        let imagePath = getLocalImageByPath(build.currentLvl, 'builds/ironDeposit');

        if (imagePath) {
            await sendPhoto(callback.message.chat.id, imagePath, {
                caption: getCaption('ironDeposit', "home", build), reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        } else {
            await sendMessage(callback.message.chat.id, getCaption('ironDeposit', "home", build), {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        }
    }
}]];