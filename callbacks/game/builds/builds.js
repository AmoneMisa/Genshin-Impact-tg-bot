import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getUserName from '../../../functions/getters/getUserName.js';
import getBuild from '../../../functions/game/builds/getBuild.js';
import getCaption from '../../../functions/game/builds/getCaption.js';
import getLocalImageByPath from '../../../functions/getters/getLocalImageByPath.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import getBuildList from '../../../functions/game/builds/getBuildList.js';
import getBuildListFromTemplate from '../../../functions/game/builds/getBuildFromTemplate.js';
import buildsTemplate from '../../../template/buildsTemplate.js';
import getSession from '../../../functions/getters/getSession.js';
import getFile from '../../../functions/getters/getFile.js';

function getUpgradeButtonText(lvl) {
    if (lvl === 0) {
        return "Построить";
    }
    return "Улучшить";
}

export default [[/^player\.([\-0-9]+)\.builds$/, async function (session, callback, [, chatId]) {
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
        sendPhoto(userId, file, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
            caption: `@${getUserName(session, "nickname")}, выбери здание, с которым хочешь взаимодействовать`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: buttons
            }
        }).then(message => id = message.message_id);
    } else {
        sendMessage(userId, `@${getUserName(session, "nickname")}, выбери здание, с которым хочешь взаимодействовать`, {
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
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                caption: getCaption('palace', "home", build), reply_markup: {
                    inline_keyboard: keyboard
                }
            });
        } else {
            await sendMessage(callback.message.chat.id, getCaption('palace', "home", build), {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        }
    }
}], [/^builds\.([\-0-9]+)\.goldMine(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");

    let foundedSession = await getSession(chatId, callback.from.id);

    if (!foundedSession.game.hasOwnProperty('builds')) {
        return;
    }

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
            message_id: callback.message.message_id,
            reply_markup: {
                inline_keyboard: keyboard
            }
        }, callback.message.photo);
    } else {
        let imagePath = getLocalImageByPath(build.currentLvl, 'builds/goldMine');

        if (imagePath) {
            await sendPhoto(callback.message.chat.id, imagePath, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                caption: getCaption('goldMine', "home", build), reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        } else {
            await sendMessage(callback.message.chat.id, getCaption('goldMine', "home", build), {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
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
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                caption: getCaption('crystalLake', "home", build), reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        } else {
            await sendMessage(callback.message.chat.id, getCaption('crystalLake', "home", build), {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
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
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                caption: getCaption('ironDeposit', "home", build), reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        } else {
            await sendMessage(callback.message.chat.id, getCaption('ironDeposit', "home", build), {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        }
    }
}], [/^builds\.([\-0-9]+)\.traineeArea(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");
    let foundedSession = await getSession(chatId, callback.from.id);

    if (!foundedSession.game.hasOwnProperty('builds')) {
        return;
    }

    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'traineeArea');
    let keyboard = [[{
        text: "Статус",
        callback_data: `builds.${chatId}.traineeArea.status`,
    }, {
        text: getUpgradeButtonText(build.currentLvl),
        callback_data: `builds.${chatId}.traineeArea.upgrade`,
    }], [{
        text: "Собрать прибыть",
        callback_data: `builds.${chatId}.traineeArea.collect`,
    }], [{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]];

    if (isBack) {
        await editMessageCaption(getCaption('traineeArea', "home", build), {
            chat_id: callback.message.chat.id,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: keyboard
            }
        }, callback.message.photo);
    } else {
        let imagePath = getLocalImageByPath(build.currentLvl, 'builds/traineeArea');

        if (imagePath) {
            await sendPhoto(callback.message.chat.id, imagePath, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                caption: getCaption('traineeArea', "home", build), reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        } else {
            await sendMessage(callback.message.chat.id, getCaption('traineeArea', "home", build), {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        }
    }
}], [/^builds\.([\-0-9]+)\.forge(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");
    let foundedSession = await getSession(chatId, callback.from.id);

    if (!foundedSession.game.hasOwnProperty('builds')) {
        return;
    }

    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'forge');
    let keyboard = [[{
        text: "Статус",
        callback_data: `builds.${chatId}.forge.status`,
    }, {
        text: getUpgradeButtonText(build.currentLvl),
        callback_data: `builds.${chatId}.forge.upgrade`,
    }], [{
        text: "Улучшить снаряжение",
        callback_data: `builds.${chatId}.forge.equipUpgrade`,
    }, {
        text: "Разобрать снаряжение",
        callback_data: `builds.${chatId}.forge.equipDestroy`,
    }], [{
        text: "Полировка снаряжения",
        callback_data: `builds.${chatId}.forge.equipPoly`,
    }, {
        text: "Починить снаряжение",
        callback_data: `builds.${chatId}.forge.equipRepair`,
    }], [{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]];

    if (isBack) {
        await editMessageCaption(getCaption('forge', "home", build), {
            chat_id: callback.message.chat.id,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: keyboard
            }
        }, callback.message.photo);
    } else {
        let imagePath = getLocalImageByPath(build.currentLvl, 'builds/forge');

        if (imagePath) {
            await sendPhoto(callback.message.chat.id, imagePath, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                caption: getCaption('forge', "home", build), reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        } else {
            await sendMessage(callback.message.chat.id, getCaption('forge', "home", build), {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                reply_markup: {
                    inline_keyboard: keyboard
                }
            })
        }
    }
}]];