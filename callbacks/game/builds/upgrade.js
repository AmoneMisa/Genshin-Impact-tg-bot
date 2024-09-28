const getBuild = require("../../../functions/game/builds/getBuild");
const buttonsDictionary = require("../../../dictionaries/buttons");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");
const getCaption = require('../../../functions/game/builds/getCaption');
const calculateUpgradeCosts = require('../../../functions/game/builds/calculateUpgradeCosts');
const calculateOptimalSpeedUpCost = require('../../../functions/game/builds/calculateOptimalSpeedUpCost');
const speedupUpgradeBuild = require('../../../functions/game/builds/speedupUpgradeBuild');
const payForUpgrade = require('../../../functions/game/builds/payForUpgrade');
const upgradeBuildTimer = require('../../../functions/game/builds/upgradeBuildTimer');
const isCanBeBuild = require('../../../functions/game/builds/isCanBeBuild');
const calculateRemainBuildTime = require('../../../functions/game/builds/calculateRemainBuildTime');
const buildsTemplate = require("../../../templates/buildsTemplate");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const getUserName = require('../../../functions/getters/getUserName');
const getBuildList = require("../../../functions/game/builds/getBuildList");
const getSession = require("../../../functions/getters/getSession");
const statsDictionary = require("../../../dictionaries/statsDictionary");
const editMessageCaption = require('../../../functions/tgBotFunctions/editMessageCaption');

async function errorUpdateMessage(buildName, build, chatId, messageId, callback, session) {
    return editMessageCaption(`@${getUserName(session, "nickname")}, здание не может быть улучшено, т.к. не выполнены требования для его улучшения.\n\n${await getUpgradeRequirementsMessage(buildName, build.currentLvl, chatId, callback.from.id)}`, {
        chat_id: callback.message.chat.id,
        message_id: messageId,
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
}

async function getUpgradeRequirementsMessage(buildName, currentLvl, chatId, userId) {
    let buildList = await getBuildList(chatId, userId);
    let upgrades = buildsTemplate[buildName].upgradeRequirements[currentLvl - 1];
    let str = "";

    for (let upgradeKey of Object.keys(upgrades)) {
        if (upgradeKey === "buildRequirements") {
            str += "Требования построек:\n"

            for (let buildRequirement of upgrades.buildRequirements) {
                str += `Требуется: ${buildsTemplate[buildRequirement.name].name} - ${buildRequirement.level} ур.\n`;
                str += `Текущее: ${buildsTemplate[buildRequirement.name].name} - ${buildList[buildRequirement.name].currentLvl} ур.\n`;
            }
        }

        if (upgradeKey === "characterRequirements") {
            str += "\nТребования персонажа:\n"
            let session = await getSession(chatId, userId);
            for (let requirement of upgrades.characterRequirements) {
                for (let [key, value] of Object.entries(requirement)) {
                    str += `Требуется: ${statsDictionary[key]} - ${value}\n`;
                    str += `Текущее: ${statsDictionary[key]} - ${session.game.stats[key] || session.game.gameClass.stats[key]}`;
                }
            }
        }
    }
    return str;
}

module.exports = [[/^builds\.[\-0-9]+\.[^.]+\.upgrade$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.upgrade$/);
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let foundedSession = await getSession(chatId, callback.from.id);

    if (!await isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return errorUpdateMessage(buildName, build, chatId, messageId, callback, foundedSession);
    }

    let keyboard;
    let caption;

    if (build.upgradeStartedAt) {
        let remain = calculateRemainBuildTime(buildName, build);
        keyboard = [[{
            text: "Ускорить постройку",
            callback_data: `builds.${chatId}.${buildName}.upgrade.speedup`
        }], [{
            text: "Назад",
            callback_data: `builds.${chatId}.${buildName}.back`
        }], [{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];

        await sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, здание на данный момент улучшается.\n\nВы можете ускорить постройку, нажав на кнопку "Ускорить"\n\nОставшееся время улучшения: ${getStringRemainTime(remain)}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
        caption = "upgrade.speedup";
    } else {
        keyboard = [[{
            text: "Улучшить",
            callback_data: `builds.${chatId}.${buildName}.upgrade.upgradeLvl`
        }], [{
            text: "Назад",
            callback_data: `builds.${chatId}.${buildName}.back`
        }], [{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];

        caption = "upgrade";
    }

    return editMessageCaption(getCaption(buildName, caption, build), {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: keyboard
        }
    }, callback.message.photo);
}], [/^builds\.[\-0-9]+\.[^.]+\.upgrade\.upgradeLvl$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.upgrade\.upgradeLvl$/);
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let foundedSession = await getSession(chatId, callback.from.id);

    if (!await isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return errorUpdateMessage(buildName, build, chatId, messageId, callback, foundedSession);
    }
    let buildTemplate = buildsTemplate[buildName];
    let nextLvl = build.currentLvl + 1;
    let currentUpgrade = calculateUpgradeCosts(buildTemplate.upgradeCosts, nextLvl);
    let playerInventory = foundedSession.game.inventory;

    if (playerInventory.gold < currentUpgrade.gold) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, недостаточно золота.\n\nВ наличии: ${playerInventory.gold}.\n\nНеобходимо: ${currentUpgrade.gold}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 5000);
    }

    if (playerInventory.crystals < currentUpgrade.crystals) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, недостаточно кристаллов.\n\nВ наличии: ${playerInventory.crystals}.\n\nНеобходимо: ${currentUpgrade.crystals}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 5000);
    }

    if (playerInventory.ironOre < currentUpgrade.ironOre) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, недостаточно железной руды.\n\nВ наличии: ${playerInventory.ironOre}.\n\nНеобходимо: ${currentUpgrade.ironOre}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 5000);
    }

    return editMessageCaption(getCaption(buildName, "upgrade.upgradeLvl", build), {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [[{
                text: "Подтвердить улучшение",
                callback_data: `builds.${chatId}.${buildName}.upgrade.upgradeLvl.0`
            }], [{
                text: "Назад",
                callback_data: `builds.${chatId}.${buildName}.back`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^builds\.[\-0-9]+\.[^.]+\.upgrade\.speedup$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.upgrade\.speedup$/);
    let messageId = callback.message.message_id;
    let foundedSession = await getSession(chatId, callback.from.id);

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (!await isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return errorUpdateMessage(buildName, build, callback.message.chat.id, messageId, callback, foundedSession);
    }

    if (!build.upgradeStartedAt) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, ошибка ускорения постройки`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
    }

    if (foundedSession.game.inventory.crystals < calculateOptimalSpeedUpCost(buildName, build)) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, Вы не можете ускорить постройку из-за недостаточного количества кристаллов.`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 5000);
    }

    return editMessageCaption(getCaption(buildName, "upgrade.speedup.0", build), {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [[{
                text: "Подтвердить ускорение",
                callback_data: `builds.${chatId}.${buildName}.upgrade.speedup.0`
            }], [{
                text: "Назад",
                callback_data: `builds.${chatId}.${buildName}.back`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^builds\.[\-0-9]+\.[^.]+\.upgrade\.speedup\.0$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.upgrade\.speedup\.0$/);
    let messageId = callback.message.message_id;
    let foundedSession = await getSession(chatId, callback.from.id);

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (!build.upgradeStartedAt) {
        return sendMessageWithDelete(chatId, `@${getUserName(foundedSession, "nickname")}, ошибка ускорения постройки`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
    }

    if (!await isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return errorUpdateMessage(buildName, build, chatId, messageId, callback, foundedSession);
    }
    let speedupCost = calculateOptimalSpeedUpCost(buildName, build);

    if (foundedSession.game.inventory.crystals < speedupCost) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, Вы не можете ускорить постройку из-за недостаточного количества кристаллов.`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 5000);
    }

    speedupUpgradeBuild(buildName, build, foundedSession.game.inventory);

    return editMessageCaption(getCaption(buildName, "upgrade.speedup.1", build), {
        chat_id: callback.message.chat.id,
        message_id: messageId,
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

}], [/^builds\.[\-0-9]+\.[^.]+\.upgrade\.upgradeLvl\.0$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.upgrade\.upgradeLvl\.0$/);
    let messageId = callback.message.message_id;
    let foundedSession = await getSession(chatId, callback.from.id);

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (!await isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return errorUpdateMessage(buildName, build, chatId, messageId, callback, foundedSession);
    }

    build.upgradeStartedAt = new Date().getTime();
    payForUpgrade(build.currentLvl, buildName, foundedSession.game.inventory);
    upgradeBuildTimer(buildName, build, chatId, foundedSession);

    return editMessageCaption(getCaption(buildName, "upgrade.upgradeLvl.0", build), {
        chat_id: callback.message.chat.id,
        message_id: messageId,
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