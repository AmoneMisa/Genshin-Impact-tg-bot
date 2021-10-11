const getRandom = require('../../functions/getRandom');
const sendMessage = require('../../functions/sendMessage');
const getOffset = require('../../functions/getOffset');
const getTime = require('../../functions/getTime');
const setLevel = require('../../functions/boss/setLevel');
const bot = require('../../bot');

module.exports = [[/^chest_[0-9]+$/, function (session, callback) {
    let [remain, hours, minutes, seconds] = getTime(session.timerOpenChestCallback);

    if (remain > 0) {
        if (hours > 0) {
            return sendMessage(callback.message.chat.id,`@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`, {
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Закрыть",
                        callback_data: "close"
                    }]]
                }
            });
        } else if (minutes > 0) {
            return sendMessage(callback.message.chat.id,`@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${minutes} мин ${seconds} сек`, {
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Закрыть",
                        callback_data: "close"
                    }]]
                }
            });
        } else {
            return sendMessage(callback.message.chat.id,`@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${seconds} сек`, {
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Закрыть",
                        callback_data: "close"
                    }]]
                }
            });
        }
    }

    session.timerOpenChestCallback = getOffset(24 * 60 * 60);

    bot.deleteMessage(callback.message.chat.id, callback.message.id);
    let prizes = [{
        name: "experience",
        minAmount: 100,
        maxAmount: 650
    }, {
        name: "gold",
        minAmount: 100,
        maxAmount: 1500
    }, {
        name: "nothing"
    }];
    let randomPrize = getRandom(0, prizes.length - 1);

    if (!session.game) {
        session.game = {
            shopTimers: {
                swordImmune: 0,
                swordAddMM: 0,
                addBossDmg: 0,
                addBossCritChance: 0,
                addBossCritDmg: 0,
                swordAdditionalTry: 0
            },
            inventory: {
                gold: 0,
                potions: [{name: "hp_1000", count: 0}, {name: "hp_3000", count: 0}]
            },
            boss: {
                hp: 1000,
                damagedHp: 0,
                bonus: {}
            }
        };
    }

    if (prizes[randomPrize].name === "nothing") {
        let stickers = [
            "CAACAgIAAxkBAAIWs2Cqh-6VK5pR1ZkghaFcl-KrMqVoAAKZBwACGELuCKCi80XCwWuZHwQ",
            "CAACAgIAAxkBAAIWl2Cqg_3KHzusKubqscU7FRz0d4HFAAKyAAMQIQIQU0i6-SiGGyYfBA",
            "CAACAgIAAxkBAAIWtGCqiCJx92Cc4WgxJS5XZfwiYG8rAALYBwACGELuCBU4big7eueWHwQ",
            "CAACAgIAAxkBAAIWtWCqiDbWkYllDpPvosBy_UkfbXk2AAK7AAPO2OgLq5hxIyJkXq0fBA",
            "CAACAgIAAxkBAAIWtmCqiEL0qpcfkBGxMTx_gR9mBN1jAALBAAMQIQIQYS0Ksj-QAu8fBA",
            "CAACAgIAAxkBAAIWt2CqiFLkxcfmAyw5gmtSEFHg5XGGAALTAAPO2OgLL5Ep2erx6UQfBA"
        ];

        let index = Math.floor(Math.random() * stickers.length);

        return bot.sendSticker(callback.message.chat.id, stickers[index]);
    } else if (prizes[randomPrize].name === "gold") {
        let gold = getRandom(prizes[randomPrize].minAmount, prizes[randomPrize].maxAmount);
        session.game.inventory.gold += gold;
        return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, ты получил(-а) ${gold} золота`);
    } else if (prizes[randomPrize].name === "experience") {
        let experience = getRandom(prizes[randomPrize].minAmount, prizes[randomPrize].maxAmount);
        session.game.stats.currentExp += experience;
        setLevel(session);
        return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, ты получил(-а) ${experience} опыта`);
    }
}]];