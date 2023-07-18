const sendPhoto = require('../../../functions/tgBotFunctions/sendPhoto');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getUserName = require('../../../functions/getters/getUserName');
const getBuild = require('../../../functions/game/builds/getBuild');
const getCaption = require('../../../functions/game/builds/getCaption');
const getLocalImageByPath = require("../../../functions/getters/getLocalImageByPath");
const buttonsDictionary = require("../../../dictionaries/buttons");
const bot = require('../../../bot');
const getBuildList = require("../../../functions/game/builds/getBuildList");
const getBuildListFromTemplate = require("../../../functions/game/builds/getBuildFromTemplate");
const buildsTemplate = require("../../../templates/buildsTemplate");

function getUpgradeButtonText(lvl) {
    if (lvl === 0) {
        return "Построить";
    }
    return "Улучшить";
}

module.exports = [["player.builds", async function (session, callback) {
    let id;
    let chatId = callback.message.chat.id;
    let userId = session.userChatData.user.id;
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
        for (let [key, build] of Object.entries(buildsList)) {
            if (i % 3 === 0) {
                tempArray = [];
                buttons.push(tempArray);
            }

            tempArray.push({text: buildsTemplate[key].name, callback_data: `builds.${key}`});
            i++;
        }
    }

    buttons.push([{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]);

    sendMessage(userId, `@${getUserName(session, "nickname")}, выбери здание, с которым хочешь взаимодействовать`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: buttons
        }
    }).then(message => id = message.message_id);
}], [/^builds\.palace(?:\.back)?$/, async function (session, callback) {
    const isBack = callback.data === 'builds.palace.back';

    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    if (!session.game.hasOwnProperty('builds')) {
        return;
    }

    let chatId = callback.message.chat.id;
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'palace');

    if (isBack && callback.message.photo) {
        await bot.editMessageCaption(getCaption('palace', "home", build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Изменить тип",
                    callback_data: "builds.palace.changeType",
                }, {
                    text: "Статус",
                    callback_data: "builds.palace.status",
                }], [{
                    text: "Улучшить",
                    callback_data: "builds.palace.upgrade",
                }, {
                    text: "Статус казны",
                    callback_data: "builds.palace.guarded",
                }], [{
                    text: "Изменить название",
                    callback_data: "builds.palace.changeName",
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } else {
        let imagePath = getLocalImageByPath(build.currentLvl, `builds/palace/${build.type || 'common'}`);

        if (imagePath) {
            await sendPhoto(chatId, imagePath, {
                caption: getCaption('palace', "home", build), reply_markup: {
                    inline_keyboard: [[{
                        text: "Изменить тип",
                        callback_data: "builds.palace.changeType",
                    }, {
                        text: "Статус",
                        callback_data: "builds.palace.status",
                    }], [{
                        text: "Улучшить",
                        callback_data: "builds.palace.upgrade",
                    }, {
                        text: "Статус казны",
                        callback_data: "builds.palace.guarded",
                    }], [{
                        text: "Изменить название",
                        callback_data: "builds.palace.changeName",
                    }], [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            });
        } else {
            await sendMessage(chatId, getCaption('palace', "home", build), {
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Изменить тип",
                        callback_data: "builds.palace.changeType",
                    }, {
                        text: "Статус",
                        callback_data: "builds.palace.status",
                    }], [{
                        text: "Улучшить",
                        callback_data: "builds.palace.upgrade",
                    }, {
                        text: "Статус казны",
                        callback_data: "builds.palace.guarded",
                    }], [{
                        text: "Изменить название",
                        callback_data: "builds.palace.changeName",
                    }], [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            })
        }
    }
}], [/^builds\.goldMine(?:\.back)?$/, async function (session, callback) {
    const isBack = callback.data === 'builds.goldMine.back';

    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    if (!session.game.hasOwnProperty('builds')) {
        return;
    }

    let chatId = callback.message.chat.id;
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'goldMine');

    if (isBack && callback.message.photo) {
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
                }], [{
                    text: "Собрать прибыть",
                    callback_data: "builds.goldMine.collect",
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } else {
        let imagePath = getLocalImageByPath(build.currentLvl, 'builds/goldMine');

        if (imagePath) {
            await sendPhoto(chatId, imagePath, {
                caption: getCaption('goldMine', "home", build), reply_markup: {
                    inline_keyboard: [[{
                        text: "Статус",
                        callback_data: "builds.goldMine.status",
                    }, {
                        text: "Улучшить",
                        callback_data: "builds.goldMine.upgrade",
                    }], [{
                        text: "Собрать прибыть",
                        callback_data: "builds.goldMine.collect",
                    }], [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            })
        } else {
            await sendMessage(chatId, getCaption('goldMine', "home", build), {
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Статус",
                        callback_data: "builds.goldMine.status",
                    }, {
                        text: "Улучшить",
                        callback_data: "builds.goldMine.upgrade",
                    }], [{
                        text: "Собрать прибыть",
                        callback_data: "builds.goldMine.collect",
                    }], [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            })
        }
    }
}], [/^builds.crystalLake(?:\.back)?$/, async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }
    const isBack = callback.data === 'builds.crystalLake.back';

    if (!session.game.hasOwnProperty('builds')) {
        return;
    }

    let chatId = callback.message.chat.id;
    let messageId = callback.message.message_id;

    let build = getBuild(chatId, callback.from.id, 'crystalLake');

    if (isBack && callback.message.photo) {
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
                }], [{
                    text: "Собрать прибыть",
                    callback_data: "builds.crystalLake.collect",
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } else {
        let imagePath = getLocalImageByPath(build.currentLvl, 'builds/crystalLake');

        if (imagePath) {
            await sendPhoto(chatId, imagePath, {
                caption: getCaption('crystalLake', "home", build), reply_markup: {
                    inline_keyboard: [[{
                        text: "Статус",
                        callback_data: "builds.crystalLake.status",
                    }, {
                        text: getUpgradeButtonText(build.currentLvl),
                        callback_data: "builds.crystalLake.upgrade",
                    }], [{
                        text: "Собрать прибыть",
                        callback_data: "builds.crystalLake.collect",
                    }], [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            })
        } else {
            await sendMessage(chatId, getCaption('crystalLake', "home", build), {
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Статус",
                        callback_data: "builds.crystalLake.status",
                    }, {
                        text: getUpgradeButtonText(build.currentLvl),
                        callback_data: "builds.crystalLake.upgrade",
                    }], [{
                        text: "Собрать прибыть",
                        callback_data: "builds.crystalLake.collect",
                    }], [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            })
        }
    }
}], [/^builds.ironDeposit(?:\.back)?$/, async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    const isBack = callback.data === 'builds.ironDeposit.back';

    if (!session.game.hasOwnProperty('builds')) {
        return;
    }

    let chatId = callback.message.chat.id;
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, 'ironDeposit');
    if (isBack && callback.message.photo) {
        await bot.editMessageCaption(getCaption('ironDeposit', "home", build), {
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
        let imagePath = getLocalImageByPath(build.currentLvl, 'builds/ironDeposit');

        if (imagePath) {
            await sendPhoto(chatId, imagePath, {
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
        } else {
            await sendMessage(chatId, getCaption('ironDeposit', "home", build), {
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
            })
        }
    }
}]];