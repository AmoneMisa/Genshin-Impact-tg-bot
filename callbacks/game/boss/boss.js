const getUserName = require("../../../functions/getters/getUserName");
const getMembers = require("../../../functions/getters/getMembers");
const getChatSession = require("../../../functions/getters/getChatSession");
const getEmoji = require("../../../functions/getters/getEmoji");
const summonBoss = require("../../../functions/game/boss/summonBoss");
const getBossLoot = require("../../../functions/game/boss/getters/getBossLoot");
const getSkillCooldown = require("../../../functions/game/player/getters/getSkillCooldown");
const getCurrentHp = require("../../../functions/game/player/getters/getCurrentHp");
const getBossStatusMessage = require("../../../functions/game/boss/getters/getBossStatusMessage");
const summonBossMessage = require("../../../functions/game/boss/summonBossMessage");
const getAliveBoss = require("../../../functions/game/boss/getBossStatus/getAliveBoss");
const buttonsDictionary = require("../../../dictionaries/buttons");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const sendPhoto = require("../../../functions/tgBotFunctions/sendPhoto");
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const editMessageCaption = require("../../../functions/tgBotFunctions/editMessageCaption");
const getLocalImageByPath = require("../../../functions/getters/getLocalImageByPath");
const inventoryDictionary = require('../../../dictionaries/inventory.js');
const getTime = require("../../../functions/getters/getTime");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");

module.exports = [["boss", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let keyboard = [];
    let boss = getAliveBoss(chatId);
    let message = "";

    if (!boss) {
        keyboard.push([{
            text: "Призвать босса",
            callback_data: "boss.summon"
        }]);
        message = "Призови босса!"
    } else {
        keyboard.push([{
            text: "Нанести удар",
            callback_data: "boss.dealDamage"
        }, {
            text: "Статистика босса",
            callback_data: "boss.status"
        }], [{
            text: "Возможный дроп",
            callback_data: "boss.lootList"
        }, {
            text: "Список урона",
            callback_data: "boss.damageList"
        }]);
        message = summonBossMessage(chatId, boss, false);
    }

    return editMessageCaption(message, {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...keyboard, [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], ["boss.summon", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let aliveBoss = getAliveBoss(chatId);

    if (aliveBoss) {
        await sendMessage(chatId, summonBossMessage(chatId, aliveBoss, true), {
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
        return;
    }

    let boss = await summonBoss(chatId);

    let chatSession = getChatSession(chatId);
    chatSession.bossMenuMessageId = callback.message.message_id;

    let keyboard = [[{
        text: "Нанести удар",
        callback_data: "boss.dealDamage"
    }, {
        text: "Статистика босса",
        callback_data: "boss.status"
    }], [{
        text: "Возможный дроп",
        callback_data: "boss.lootList"
    }, {
        text: "Список урона",
        callback_data: "boss.damageList"
    }]];

    await deleteMessage(chatId, messageId);

    let imagePath = getLocalImageByPath(boss.stats.lvl, `bosses/${boss.name}`);

    if (imagePath) {
        return sendPhoto(callback.message.chat.id, imagePath, {
            caption: `${summonBossMessage(chatId, boss, false)}`,
            reply_markup: {
                inline_keyboard: [...keyboard, [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } else {
        return sendMessage(callback.message.chat.id, `${summonBossMessage(chatId, boss, false)}`, {
            reply_markup: {
                inline_keyboard: [...keyboard, [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        })
    }
}], ["boss.dealDamage", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let aliveBoss = getAliveBoss(chatId);

    if (!aliveBoss) {
        await sendMessageWithDelete(chatId, "Группа ещё не призвала босса. Призвать босса можно через меню /boss", {}, 10 * 1000);
        return;
    }

    if (getCurrentHp(session, session.game.gameClass) <= 0) {
        let [remain] = getTime(session.game.respawnTime);

        await sendMessage(chatId, `Ты мёртв. Время до воскрешения: ${getStringRemainTime(remain)}.`);
        return;
    }

    let buttonsSkills = [];
    for (let skill of session.game.gameClass.skills) {
        let skillName = skill.name;

        if (getSkillCooldown(skill) > new Date().getTime()) {
            skillName += " (В откате)";
        }

        buttonsSkills.push([{text: skillName, callback_data: `skill.${chatId}.${skill.slot}`}]);
    }

    let message = "";

    for (let skill of session.game.gameClass.skills) {
        let costCount = skill.costHp > 0 ? skill.costHp : skill.cost;
        let costType = skill.costHp > 0 ? "hp" : "mp";

        message += `${skill.name} - ${skill.description} Стоимость использования: ${getEmoji(costType)} ${costCount}\n\n`;
    }

    let imagePath = getLocalImageByPath(aliveBoss.stats.lvl, `bosses/${aliveBoss.name}`);

    await sendPhoto(callback.from.id, imagePath, {
        caption: `Выбери скилл:\n${message}`,
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...buttonsSkills, [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], ["boss.status", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let aliveBoss = getAliveBoss(chatId);

    if (!aliveBoss) {
        await sendMessageWithDelete(chatId, "Группа ещё не призвала босса. Призвать босса можно через меню /boss", {}, 10 * 1000);
        return;
    }

    await editMessageCaption(getBossStatusMessage(aliveBoss), {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "boss"
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], ["boss.lootList", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let aliveBoss = getAliveBoss(chatId);

    if (!aliveBoss) {
        await sendMessageWithDelete(chatId, "Группа ещё не призвала босса. Призвать босса можно через меню /boss", {}, 10 * 1000);
        return;
    }

    let loot = getBossLoot(aliveBoss);
    let message = "Возможный дроп\n";
    for (let [key, value] of Object.entries(loot)) {
        message += `\n${getEmoji(key)} ${inventoryDictionary[key]}:\n`;
        let max = Math.max(...value.map(item => item.maxAmount));
        let min = Math.min(...value.map(item => item.minAmount));

        if (key === "experience") {
            for (let i = 0; i < value.length; i++) {
                let place = i + 1;
                let item = value[i];
                let isLast = i === value.length - 1;
                let localMax = item.maxAmount;
                let localMin = item.minAmount;

                if (isLast) {
                    message += `${place}-∞ место - ${localMin}-${localMax}\n`;
                } else {
                    message += `${place} место - ${localMin}-${localMax}\n`;
                }
            }
        } else {
            message += `${min}-${max} - ${getEmoji("chance")} 100%\n`;
        }
    }

    await editMessageCaption(message, {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "boss"
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], ["boss.damageList", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let aliveBoss = getAliveBoss(chatId);

    if (!aliveBoss) {
        await sendMessageWithDelete(chatId, "Группа ещё не призвала босса. Призвать босса можно через меню /boss", {}, 10 * 1000);
        return;
    }

    let players = aliveBoss.listOfDamage;
    players.sort((a, b) => b.damage - a.damage);
    let message = `Текущее хп босса: ${aliveBoss.currentHp}\n\nСписок урона по боссу:\n`;
    let members = getMembers(chatId);
    for (let player of players) {
        message += `${getUserName(members[player.id], "nickname")}: ${player.damage}\n`;
    }

    await editMessageCaption(message, {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "boss"
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}]];