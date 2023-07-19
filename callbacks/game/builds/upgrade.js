const getBuild = require("../../../functions/game/builds/getBuild");
const bot = require("../../../bot");
const buttonsDictionary = require("../../../dictionaries/buttons");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");
const getCaption = require('../../../functions/game/builds/getCaption');
const calculateUpgradeCosts = require('../../../functions/game/builds/calculateUpgradeCosts');
const calculateOptimalSpeedUpCost = require('../../../functions/game/builds/calculateOptimalSpeedUpCost');
const speedupUpgradeBuild = require('../../../functions/game/builds/speedupUpgradeBuild');
const upgradeBuildTimer = require('../../../functions/game/builds/upgradeBuildTimer');
const isCanBeBuild = require('../../../functions/game/builds/isCanBeBuild');
const calculateRemainBuildTime = require('../../../functions/game/builds/calculateRemainBuildTime');
const buildsTemplate = require("../../../templates/buildsTemplate");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const getUserName = require('../../../functions/getters/getUserName');
const getBuildList = require("../../../functions/game/builds/getBuildList");
const getSession = require("../../../functions/getters/getSession");
const userStatsMap = require("../../../dictionaries/userStats");

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
            for (let characterRequirement of upgrades.characterRequirements) {
                str += `Требуется: ${userStatsMap[characterRequirement.name]} - ${characterRequirement.level}\n`;
                str += `Текущее: ${userStatsMap[characterRequirement.name]} - ${session.game.stats[characterRequirement.name] || session.game.gameClass.stats[characterRequirement.name]}`;
            }
        }
    }
    return str;
}

module.exports = [[/^builds\.[\-0-9]+\.[^.]+\.upgrade$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.upgrade$/);
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let foundedSession = getSession(chatId, callback.from.id);

    if (!isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return sendMessage(chatId, `@${getUserName(foundedSession, "nickname")}, здание не может быть улучшено, т.к. не выполнены требования для его улучшения.\n\n${await getUpgradeRequirementsMessage(buildName, build.currentLvl, chatId, callback.from.id)}`, {
            reply_markup: {
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `builds.${chatId}.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    }
    let keyboard;
    let caption;

    if (build.upgradeStartedAt) {
        let remain = calculateRemainBuildTime(buildName, build);
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

        sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, здание на данный момент улучшается.\n\nВы можете ускорить постройку, нажав на кнопку "Ускорить"\n\nОставшееся время улучшения: ${getStringRemainTime(remain)}`, {}, 10 * 1000);
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

    if (callback.message.photo) {
        await bot.editMessageCaption(getCaption(buildName, caption, build), {
            chat_id: callback.message.chat.id,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } else {
        await sendMessage(callback.message.chat.id, getCaption(buildName, caption, build), {
            reply_markup: {
                inline_keyboard: keyboard
            }
        })
    }
}], [/^builds\.[\-0-9]+\.[^.]+\.upgrade\.upgradeLvl$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.upgrade\.upgradeLvl$/);
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let foundedSession = getSession(chatId, callback.from.id);

    if (!isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return sendMessage(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, здание не может быть улучшено, т.к. не выполнены требования для его улучшения.\n\n${getUpgradeRequirementsMessage(buildName, build.currentLvl, chatId, callback.from.id)}`, {
            reply_markup: {
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `builds.${chatId}.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    }
    let buildTemplate = buildsTemplate[buildName];

    let nextLvl = build.currentLvl + 1;
    let currentUpgrade = calculateUpgradeCosts(buildTemplate.upgradeCosts, nextLvl);
    let playerInventory = foundedSession.game.inventory;

    if (playerInventory.gold < currentUpgrade.gold) {
        await sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, недостаточно золота.\n\nВ наличии: ${playerInventory.gold}.\n\nНеобходимо: ${currentUpgrade.gold}`, {}, 5000);
        return;
    }

    if (playerInventory.crystals < currentUpgrade.crystals) {
        await sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, недостаточно кристаллов.\n\nВ наличии: ${playerInventory.crystals}.\n\nНеобходимо: ${currentUpgrade.crystals}`, {}, 5000);
        return;
    }

    if (playerInventory.ironOre < currentUpgrade.ironOre) {
        await sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, недостаточно железной руды.\n\nВ наличии: ${playerInventory.ironOre}.\n\nНеобходимо: ${currentUpgrade.ironOre}`, {}, 5000);
        return;
    }

    if (callback.message.photo) {
        await bot.editMessageCaption(getCaption(buildName, "upgrade.upgradeLvl", build), {
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
        });
    } else {
        await sendMessage(callback.message.chat.id, getCaption(buildName, "upgrade.upgradeLvl", build), {
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
        })
    }
}], [/^builds\.[\-0-9]+\.[^.]+\.upgrade\.speedup$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.upgrade\.speedup$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let foundedSession = getSession(chatId, callback.from.id);

    let build = await getBuild(chatId, callback.from.id, buildName);
    if (!isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return sendMessage(chatId, `@${getUserName(session, "nickname")}, здание не может быть улучшено, т.к. не выполнены требования для его улучшения.\n\n${await getUpgradeRequirementsMessage(buildName, build.currentLvl, chatId, callback.from.id)}`, {
            reply_markup: {
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `builds.${chatId}.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    }
    if (!build.upgradeStartedAt) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, ошибка ускорения постройки`, {}, 10 * 1000);
    }

    if (foundedSession.game.inventory.crystals < calculateOptimalSpeedUpCost(buildName, build)) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, Вы не можете ускорить постройку из-за недостаточного количества кристаллов.`, {}, 5000);
    }

    if (callback.message.photo) {
        await bot.editMessageCaption(getCaption(buildName, "upgrade.speedup.0", build), {
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
        });
    } else {
        await sendMessage(callback.message.chat.id, getCaption(buildName, "upgrade.speedup.0", build), {
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
        })
    }
}], [/^builds\.[\-0-9]+\.[^.]+\.upgrade\.speedup\.0$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.upgrade\.speedup\.0$/);
    let messageId = callback.message.message_id;
    let foundedSession = getSession(chatId, callback.from.id);

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (!build.upgradeStartedAt) {
        return sendMessageWithDelete(chatId, `@${getUserName(foundedSession, "nickname")}, ошибка ускорения постройки`, {}, 10 * 1000);
    }
    if (!isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return sendMessage(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, здание не может быть улучшено, т.к. не выполнены требования для его улучшения.\n\n${getUpgradeRequirementsMessage(buildName, build.currentLvl, chatId, callback.from.id)}`, {
            reply_markup: {
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `builds.${chatId}.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    }
    let speedupCost = calculateOptimalSpeedUpCost(buildName, build);

    if (foundedSession.game.inventory.crystals < speedupCost) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, Вы не можете ускорить постройку из-за недостаточного количества кристаллов.`, {}, 5000);
    }

    speedupUpgradeBuild(buildName, build, foundedSession);

    if (callback.message.photo) {
        await bot.editMessageCaption(getCaption(buildName, "upgrade.speedup.1", build), {
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
        });
    } else {
        await sendMessage(callback.message.chat.id, getCaption(buildName, "upgrade.speedup.1", build), {
            reply_markup: {
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `builds.${chatId}.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        })
    }
}], [/^builds\.[\-0-9]+\.[^.]+\.upgrade\.upgradeLvl\.0$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.upgrade\.upgradeLvl\.0$/);
    let messageId = callback.message.message_id;
    let foundedSession = getSession(chatId, callback.from.id);

    let build = await getBuild(chatId, callback.from.id, buildName);
    if (!isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return sendMessage(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, здание не может быть улучшено, т.к. не выполнены требования для его улучшения.\n\n${getUpgradeRequirementsMessage(buildName, build.currentLvl, chatId, callback.from.id)}`, {
            reply_markup: {
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `builds.${chatId}.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    }
    build.upgradeStartedAt = new Date().getTime();
    upgradeBuildTimer(buildName, build, chatId, foundedSession);

    if (callback.message.photo) {
        await bot.editMessageCaption(getCaption(buildName, "upgrade.upgradeLvl.0", build), {
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
        });
    } else {
        await sendMessage(callback.message.chat.id, getCaption(buildName, "upgrade.upgradeLvl.0", build), {
            reply_markup: {
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `builds.${chatId}.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        })
    }
}]];