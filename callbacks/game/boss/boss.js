const editMessageText = require("../../../functions/tgBotFunctions/editMessageText");
const getUserName = require("../../../functions/getters/getUserName");
const getMembers = require("../../../functions/getters/getMembers");
const summonBoss = require("../../../functions/game/boss/summonBoss");
const getBossStatusMessage = require("../../../functions/game/boss/getters/getBossStatusMessage");
const summonBossMessage = require("../../../functions/game/boss/summonBossMessage");
const getAliveBoss = require("../../../functions/game/boss/getBossStatus/getAliveBoss");
const buttonsDictionary = require("../../../dictionaries/buttons");
const getTime = require("../../../functions/getters/getTime");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");

module.exports = [["boss", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let keyboard = [];
    let boss = getAliveBoss(chatId);

    if (!boss) {
        keyboard.push([{
            text: "Призвать босса",
            callback_data: "boss.summon"
        }]);
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
    }

    return editMessageText(`"Выбери необходимое действие"`, {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...keyboard, [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}], ["boss.summon", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let aliveBoss = getAliveBoss(chatId);

    if (aliveBoss) {
        return summonBossMessage(chatId, aliveBoss, true);
    }

    let members = getMembers(chatId);
    for (let member of Object.values(members)) {
        member.game.gameClass.stats.hp = member.game.gameClass.stats.maxHp;
    }

    let boss = await summonBoss(chatId);

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

    return editMessageText(`${summonBossMessage(chatId, boss, false)}`, {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...keyboard, [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}], ["boss.dealDamage", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    if (!session.timerDealDamageCallback) {
        session.timerDealDamageCallback = 0;
    }

    let [remain] = getTime(session.timerDealDamageCallback);

    if (remain > 0) {
        return sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, команду можно вызывать раз в две минуты. Осталось: ${getStringRemainTime(remain)}`, {
            disable_notification: true,
        }, 6 * 1000);
    }

    let aliveBoss = getAliveBoss(chatId);

    if (!aliveBoss) {
        return sendMessageWithDelete(chatId, "Группа ещё не призвала босса. Призвать босса можно через меню /boss", {}, 10 * 1000);
    }

    if (session.game.gameClass.stats.hp <= 0) {
        return sendMessage(chatId, `Ты немножко труп. Жди следующего призыва босса`);
    }

    let buttonsSkills = [];
    for (let skill of session.game.gameClass.skills) {
        buttonsSkills.push([{text: skill.name, callback_data: `skill.${skill.slot}`}]);
    }

    let message = "";

    for (let skill of session.game.gameClass.skills) {
        message += `${skill.name} - ${skill.description} Стоимость использования: ${skill.cost} золота, ${skill.crystalCost} кристаллов.\n\n`;
    }

    return editMessageText(`@${getUserName(session, "nickname")}, выбери скилл:\n${message}`, {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...buttonsSkills, [{
                text: "Назад",
                callback_data: "boss"
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}], ["boss.status", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let aliveBoss = getAliveBoss(chatId);

    if (!aliveBoss) {
        return sendMessageWithDelete(chatId, "Группа ещё не призвала босса. Призвать босса можно через меню /boss", {}, 10 * 1000);
    }

    return editMessageText(getBossStatusMessage(aliveBoss), {
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
    });
}], ["boss.lootList", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    return editMessageText(`@${getUserName(session, "nickname")}, выбери категорию для покупки в магазине.\nВсе товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.`, {
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
    });
}], ["boss.damageList", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let aliveBoss = getAliveBoss(chatId);

    if (!aliveBoss) {
        return sendMessageWithDelete(chatId, "Группа ещё не призвала босса. Призвать босса можно через меню /boss", {}, 10 * 1000);
    }

    let players = aliveBoss.listOfDamage;
    players.sort((a, b) => b.damage - a.damage);
    let message = `Текущее хп босса: ${aliveBoss.currentHp}\n\nСписок урона по боссу:\n`;
    let members = getMembers(chatId);
    for (let player of players) {
        message += `${getUserName(members[player.id], "nickname")}: ${player.damage}\n`;
    }

    return editMessageText(message, {
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
    });
}]];