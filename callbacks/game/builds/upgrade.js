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

function getUpgradeRequirementsMessage(buildName, currentLvl, chatId, userId) {
    let buildList = getBuildList(chatId, userId);
    let upgrades = buildsTemplate[buildName].upgradeRequirements[currentLvl - 1];
    let str = "";
    for (let [upgradeKey, upgradeValue] of upgrades) {
        if (upgradeKey === "buildRequirements") {
            str += `Требуется: ${buildsTemplate[upgradeKey].name} - ${upgradeValue}\n`;
            str += `Текущее: ${buildsTemplate[upgradeKey].name} - ${buildList[upgradeKey].currentLvl}\n`;
        }

        if (upgradeKey === "characterRequirements") {
            let session = getSession(chatId, userId);
            str += `Требуется: ${userStatsMap[upgradeKey]} - ${upgradeValue}`;
            str += `Текущее: ${userStatsMap[upgradeKey]} - ${session.game.stats[upgradeKey] || session.game.gameClass.stats[upgradeKey]}`;
        }
    }

    return str;
}

module.exports = [[/^builds\.[^.]+\.upgrade$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    if (!isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return sendMessage(chatId, `@${getUserName(session, "nickname")}, здание не может быть улучшено, т.к. не выполнены требования для его улучшения.\n\n${getUpgradeRequirementsMessage(buildName, build.currentLvl, chatId, callback.from.id)}`, {
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
    let keyboard;
    let caption;

    if (build.upgradeStartedAt) {
        let remain = calculateRemainBuildTime(buildName, build);
        keyboard = [[{
            text: "Ускорить постройку",
            callback_data: `builds.${buildName}.upgrade.speedup`
        }], [{
            text: "Назад",
            callback_data: `builds.${buildName}.back`
        }], [{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];

        sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, здание на данный момент улучшается.\n\nВы можете ускорить постройку, нажав на кнопку "Ускорить"\n\nОставшееся время улучшения: ${getStringRemainTime(remain)}`, {}, 10 * 1000);
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

    await bot.editMessageCaption(getCaption(buildName, caption, build), {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
}], [/^builds\.[^.]+\.upgrade\.upgradeLvl$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade\.upgradeLvl$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (!isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return sendMessage(chatId, `@${getUserName(session, "nickname")}, здание не может быть улучшено, т.к. не выполнены требования для его улучшения.\n\n${getUpgradeRequirementsMessage(buildName, build.currentLvl, chatId, callback.from.id)}`, {
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
    let buildTemplate = buildsTemplate[buildName];

    let nextLvl = build.currentLvl + 1;
    let currentUpgrade = calculateUpgradeCosts(buildTemplate.upgradeCosts, nextLvl);
    let playerInventory = session.game.inventory;

    if (playerInventory.gold < currentUpgrade.gold) {
        await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, недостаточно золота.\n\nВ наличии: ${playerInventory.gold}.\n\nНеобходимо: ${currentUpgrade.gold}`, {}, 5000);
        return;
    }

    if (playerInventory.crystals < currentUpgrade.crystals) {
        await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, недостаточно кристаллов.\n\nВ наличии: ${playerInventory.crystals}.\n\nНеобходимо: ${currentUpgrade.crystals}`, {}, 5000);
        return;
    }

    if (playerInventory.ironOre < currentUpgrade.ironOre) {
        await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, недостаточно железной руды.\n\nВ наличии: ${playerInventory.ironOre}.\n\nНеобходимо: ${currentUpgrade.ironOre}`, {}, 5000);
        return;
    }

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
}], [/^builds\.[^.]+\.upgrade\.speedup$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade\.speedup$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    if (!isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return sendMessage(chatId, `@${getUserName(session, "nickname")}, здание не может быть улучшено, т.к. не выполнены требования для его улучшения.\n\n${getUpgradeRequirementsMessage(buildName, build.currentLvl, chatId, callback.from.id)}`, {
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
    if (!build.upgradeStartedAt) {
        return sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ошибка ускорения постройки`, {}, 10 * 1000);
    }

    if (session.game.inventory.crystals < calculateOptimalSpeedUpCost(buildName, build)) {
        return sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, Вы не можете ускорить постройку из-за недостаточного количества кристаллов.`, {}, 5000);
    }

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

}], [/^builds\.[^.]+\.upgrade\.speedup\.0$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade\.speedup\.0$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (!build.upgradeStartedAt) {
        return sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ошибка ускорения постройки`, {}, 10 * 1000);
    }
    if (!isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return sendMessage(chatId, `@${getUserName(session, "nickname")}, здание не может быть улучшено, т.к. не выполнены требования для его улучшения.\n\n${getUpgradeRequirementsMessage(buildName, build.currentLvl, chatId, callback.from.id)}`, {
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
    let speedupCost = calculateOptimalSpeedUpCost(buildName, build);

    if (session.game.inventory.crystals < speedupCost) {
        return sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, Вы не можете ускорить постройку из-за недостаточного количества кристаллов.`, {}, 5000);
    }

    speedupUpgradeBuild(buildName, build, session);

    await bot.editMessageCaption(getCaption(buildName, "upgrade.speedup.1", build), {
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
}], [/^builds\.[^.]+\.upgrade\.upgradeLvl\.0$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade\.upgradeLvl\.0$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    if (!isCanBeBuild(buildName, build, chatId, callback.from.id)) {
        return sendMessage(chatId, `@${getUserName(session, "nickname")}, здание не может быть улучшено, т.к. не выполнены требования для его улучшения.\n\n${getUpgradeRequirementsMessage(buildName, build.currentLvl, chatId, callback.from.id)}`, {
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
    build.upgradeStartedAt = new Date().getTime();
    upgradeBuildTimer(buildName, build, chatId, session);

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
}]];