const getRandom = require('../../functions/getRandom');
const sendMessage = require('../../functions/sendMessage');
const getOffset = require('../../functions/getOffset');
const getTime = require('../../functions/getTime');
const setLevel = require('../../functions/boss/setLevel');
const getRandomChest = require('../../functions/chest/getRandomChest');
const bot = require('../../bot');

let prizes = [{
    name: "experience",
    minAmount: 100,
    maxAmount: 650,
    from: 0,
    chance: 25
}, {
    name: "gold",
    minAmount: 100,
    maxAmount: 1500,
    from: 26,
    chance: 40
}, {
    name: "nothing",
    from: 66,
    chance: 34
}];

module.exports = [[/^chest_([0-9]+)$/, async function (session, callback) {
    const chest = callback.data.match(/^chest_[0-9]+$/);
    session.chestCounter = session.chestCounter || 0;
    session.chosenChests = session.chosenChests || [];

    if (session.userChatData.user.id !== callback.from.id) {
        return;
    }

    if (session.chosenChests.includes(chest)) {
        return;
    }

    if (session.chestCounter === 3) {
        session.timerOpenChestCallback = getOffset();
        session.chestCounter = 0;
        session.chosenChests = [];
        session.chestButtons = [];
        bot.deleteMessage(callback.message.chat.id, callback.message.message_id);
    }

    let [remain, hours, minutes, seconds] = getTime(session.timerOpenChestCallback);

    if (remain > 0) {
        if (hours > 0) {
            return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`, {
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Закрыть",
                        callback_data: "close"
                    }]]
                }
            });
        } else if (minutes > 0) {
            return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${minutes} мин ${seconds} сек`, {
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Закрыть",
                        callback_data: "close"
                    }]]
                }
            });
        } else {
            return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${seconds} сек`, {
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

    if (!session.chestButtons || !session.chestButtons.length) {
        session.chestButtons = getRandomChest();
    }

    let randomPrize;
    let randomInt = getRandom(0, 100);
    for (let prize of prizes) {
        if (randomInt >= prize.from && randomInt <= prize.from + prize.chance) {
            randomPrize = prize;
        }
    }

    async function editChest(emoji, buttonsArray, button, isSticker, item, message) {
        session.chestCounter++;
        session.chosenChests.push(button.callback_data);
        buttonsArray[buttonsArray.indexOf(button)] = button;
        button.text = emoji;
        await bot.editMessageReplyMarkup({inline_keyboard: session.chestButtons}, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id
        });
        if (!isSticker) {
            return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, ты получил(-а) ${item} ${message}`);
        }
    }

    for (let buttonsArray of session.chestButtons) {
        for (let button of buttonsArray) {
            if (button.callback_data.includes(chest)) {
                if (randomPrize.name === "gold") {
                    let gold = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
                    session.game.inventory.gold += gold;
                    await editChest("💸", buttonsArray, button, false, gold, "золота");
                }

                if (randomPrize.name === "experience") {
                    let experience = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
                    session.game.stats.currentExp += experience;
                    setLevel(session);
                    await editChest("📖", buttonsArray, button, false, experience, "опыта");
                }

                if (randomPrize.name === "nothing") {
                    let stickers = [
                        "CAACAgIAAxkBAAIWs2Cqh-6VK5pR1ZkghaFcl-KrMqVoAAKZBwACGELuCKCi80XCwWuZHwQ",
                        "CAACAgIAAxkBAAIWl2Cqg_3KHzusKubqscU7FRz0d4HFAAKyAAMQIQIQU0i6-SiGGyYfBA",
                        "CAACAgIAAxkBAAIWtGCqiCJx92Cc4WgxJS5XZfwiYG8rAALYBwACGELuCBU4big7eueWHwQ",
                        "CAACAgIAAxkBAAIWtWCqiDbWkYllDpPvosBy_UkfbXk2AAK7AAPO2OgLq5hxIyJkXq0fBA",
                        "CAACAgIAAxkBAAIWtmCqiEL0qpcfkBGxMTx_gR9mBN1jAALBAAMQIQIQYS0Ksj-QAu8fBA",
                        "CAACAgIAAxkBAAIWt2CqiFLkxcfmAyw5gmtSEFHg5XGGAALTAAPO2OgLL5Ep2erx6UQfBA"
                    ];
                    let index = Math.floor(Math.random() * stickers.length);
                    await editChest("💩", buttonsArray, button, true);
                    return bot.sendSticker(callback.message.chat.id, stickers[index]);
                }
            }
        }
    }
}]];