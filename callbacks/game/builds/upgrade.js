const getBuild = require("../../../functions/game/builds/getBuild");
const bot = require("../../../bot");
const buttonsDictionary = require("../../../dictionaries/buttons");
const debugMessage = require("../../../functions/tgBotFunctions/debugMessage");
const getTime = require("../../../functions/getters/getTime");
const getCaption = require('../../../functions/game/builds/getCaption');
const calculateUpgradeCosts = require('../../../functions/game/builds/calculateUpgradeCosts');
const calculateOptimalSpeedUpCost = require('../../../functions/game/builds/calculateOptimalSpeedUpCost');
const calculateBuildTime = require('../../../functions/game/builds/calculateBuildTime');
const buildsTemplate = require("../../../templates/buildsTemplate");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");

module.exports = [[/^builds\.[^.]+\.upgrade$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    let [remain] = getTime(build.upgradeStartedAt);

    if (build.upgradeStartedAt) {
        return sendMessageWithDelete(chatId, `Здание на данный момент улучшается.\n\nВы можете ускорить постройку, нажав на кнопку "Ускорить"\n\nОставшееся время улучшения: ${remain}`)
    }

    let keyboard;
    let caption;

    if (build.upgradeStartedAt) {
        keyboard = [[{
            text: "Ускорить постройку",
            callback_data: `builds.${buildName}.upgrade.speedUp`
        }], [{
            text: "Назад",
            callback_data: `builds.${buildName}.back`
        }], [{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];

        caption = "upgrade.speedup";
    } else {
        keyboard = [[{
            text: "Улучшить",
            callback_data: `builds.${buildName}.upgrade.upgradeLvl`
        }], [{
            text: "Назад",
            callback_data: `builds.${buildName}.back`
        }], [{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];

        caption = "upgrade";
    }

    // try {
        await bot.editMessageCaption(getCaption(buildName, caption, build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    // } catch (e) {
    //     debugMessage(`${chatId} - builds.${buildName}.upgrade - ошибка редактирования заголовка`);
    // }
}], [/^builds\.[^.]+\.upgrade\.upgradeLvl$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade\.upgradeLvl$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let buildTemplate = buildsTemplate[buildName];

    let nextLvl = build.currentLvl + 1;
    let currentUpgrade = calculateUpgradeCosts(buildTemplate.upgradeCosts, nextLvl);
    let playerInventory = session.game.inventory;

    console.log(currentUpgrade);
    if (playerInventory.gold < currentUpgrade.gold) {
        return sendMessageWithDelete(chatId, `Недостаточно золота.\n\nВ наличии: ${playerInventory.gold}.\n\nНеобходимо: ${currentUpgrade.gold}`, 5000);
    }

    if (playerInventory.crystals < currentUpgrade.crystals) {
        return sendMessageWithDelete(chatId, `Недостаточно кристаллов.\n\nВ наличии: ${playerInventory.crystals}.\n\nНеобходимо: ${currentUpgrade.crystals}`, 5000);
    }

    if (playerInventory.ironOre < currentUpgrade.ironOre) {
        return sendMessageWithDelete(chatId, `Недостаточно железной руды.\n\nВ наличии: ${playerInventory.ironOre}.\n\nНеобходимо: ${currentUpgrade.ironOre}`, 5000);
    }

    try {
        await bot.editMessageCaption(getCaption(buildName, "upgrade.upgradeLvl", build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Подтвердить улучшение",
                    callback_data: `builds.${buildName}.upgrade.upgradeLvl.0`
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
        debugMessage(`${chatId} - builds.${buildName}.upgrade.upgradeLvl - ошибка редактирования заголовка`);
    }
}], [/^builds\.[^.]+\.upgrade\.speedup$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade\.speedup$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (session.game.inventory.crystals < calculateOptimalSpeedUpCost(build.upgradeStartedAt)) {
     return sendMessageWithDelete(chatId, "Вы не можете ускорить постройку из-за недостаточного количества кристаллов.", 5000);
    }

    try {
        await bot.editMessageCaption(getCaption(buildName, "upgrade.speedup.0", build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Подтвердить ускорение",
                    callback_data: `builds.${buildName}.upgrade.speedup.0`
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
        debugMessage(`${chatId} - builds.${buildName}.upgrade.speedup - ошибка редактирования заголовка`);
    }
}], [/^builds\.[^.]+\.upgrade\.speedup\.0$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade\.speedup\.0$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    build.upgradeStartedAt = calculateBuildTime(buildName, build.currentLvl, build);
    build.currentLvl++;

    try {
        await bot.editMessageCaption(getCaption(buildName, "upgrade.upgradeLvl.0", build), {
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
        debugMessage(`${chatId} - builds.${buildName}.upgrade.speedup.0 - ошибка редактирования заголовка`);
    }
}], [/^builds\.[^.]+\.upgrade\.upgradeLvl\.0$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade\.upgradeLvl\.0$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    build.currentLvl++;

    try {
        await bot.editMessageCaption(getCaption(buildName, "upgrade.upgradeLvl.0", build), {
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
        debugMessage(`${chatId} - builds.${buildName}.upgrade.upgradeLvl.0 - ошибка редактирования заголовка`);
    }
}]];