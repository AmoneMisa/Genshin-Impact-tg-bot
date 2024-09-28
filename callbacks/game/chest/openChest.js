const getRandom = require('../../../functions/getters/getRandom');
const getValueByChance = require('../../../functions/getters/getValueByChance');
const getSession = require('../../../functions/getters/getSession');
const setLevel = require('../../../functions/game/player/setLevel');
const getRandomChest = require('../../../functions/game/chest/getRandomChest');
const endChestSession = require('../../../functions/game/chest/endChestSession');
const sendPrizeMessage = require('../../../functions/game/chest/sendPrizeMessage');
const editChest = require('../../../functions/game/chest/editChest');
const bot = require('../../../bot');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');

let prizes = [{
    value: {
        name: "experience",
        translatedName: "опыта",
        minAmount: 4970,
        maxAmount: 115850
    },
    chance: 15
}, {
    value: {
        name: "gold",
        translatedName: "золота",
        minAmount: 7500,
        maxAmount: 128500
    },
    chance: 20
}, {
    value: {
        name: "crystals",
        translatedName: "кристаллов",
        minAmount: 50,
        maxAmount: 950,
    },
    chance: 10
}, {
    value: {
        name: "nothing"
    },
    chance: 30
}, {
    value: {
        name: "sword",
        translatedName: "мм меча",
        minAmount: 1,
        maxAmount: 10,
    },
    chance: 10
}, {
    value: {
        name: "brokenSword",
        translatedName: "мм меча",
        minAmount: -1,
        maxAmount: -10,
    },
    chance: 5
}, {
    value: {
        name: "immuneToUpSword",
        translatedName: "иммунитет к увеличению меча"
    },
    chance: 10
}];

module.exports = [[/^chest\.([\-0-9]+)_([0-9]+)$/, async function (session, callback, [, chatId, chest]) {
    if (session.chestTries < 1) {
        return;
    }

    let foundSession = await getSession(chatId, callback.from.id);
    foundSession.chestCounter = foundSession.chestCounter || 0;
    foundSession.chosenChests = foundSession.chosenChests || [];

    if (foundSession.chosenChests.includes(chest)) {
        return;
    }

    if (!foundSession.chestButtons || !foundSession.chestButtons.length) {
        foundSession.chestButtons = getRandomChest(chatId);
    }

    let randomInt = getRandom(0, 99);
    let randomPrize = getValueByChance(randomInt, prizes);

    let button;
    for (let buttonsArray of foundSession.chestButtons) {
        for (let _button of buttonsArray) {
            let [, itemChestNumber] = _button.callback_data.match(/^chest\.[\-0-9]+_([0-9]+)$/);
            if (itemChestNumber === chest) {
                button = _button;
                break;
            }
        }
    }

    if (!button) {
        return;
    }

    if (randomPrize.name === "gold") {
        let gold = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
        foundSession.game.inventory.gold += gold;
        await sendPrizeMessage(callback, foundSession, gold, randomPrize.translatedName);
    }

    if (randomPrize.name === "crystal") {
        let crystal = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
        foundSession.game.inventory.crystals += crystal;
        await sendPrizeMessage(callback, foundSession, crystal, randomPrize.translatedName);
    }

    if (randomPrize.name === "experience") {
        let experience = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
        foundSession.game.stats.currentExp += experience;
        setLevel(foundSession);
        await sendPrizeMessage(callback, foundSession, experience, randomPrize.translatedName);
    }

    if (randomPrize.name === "nothing") {
        let stickers = [
            "CAACAgIAAxkBAAIWs2Cqh-6VK5pR1ZkghaFcl-KrMqVoAAKZBwACGELuCKCi80XCwWuZHwQ",
            "CAACAgIAAxkBAAIWl2Cqg_3KHzusKubqscU7FRz0d4HFAAKyAAMQIQIQU0i6-SiGGyYfBA",
            "CAACAgIAAxkBAAIWtGCqiCJx92Cc4WgxJS5XZfwiYG8rAALYBwACGELuCBU4big7eueWHwQ",
            "CAACAgIAAxkBAAIWtWCqiDbWkYllDpPvosBy_UkfbXk2AAK7AAPO2OgLq5hxIyJkXq0fBA",
            "CAACAgIAAxkBAAIWtmCqiEL0qpcfkBGxMTx_gR9mBN1jAALBAAMQIQIQYS0Ksj-QAu8fBA",
            "CAACAgIAAxkBAAIWt2CqiFLkxcfmAyw5gmtSEFHg5XGGAALTAAPO2OgLL5Ep2erx6UQfBA",
            "CAACAgIAAxkBAAEDRS9hjsHSVLxi9YK0bwq44_whmlLmoQACGxAAAjIQsUr3DQ8CIHFgGiIE",
            "CAACAgIAAxkBAAEDRTFhjsH3kjPYETk4ghh851nYH9OzTAAC8ysAAlOx9wNV_XxK9TD4GCIE",
            "CAACAgIAAxkBAAEDRTNhjsJAmazsmI08L4sEeJJHsNcPzgACdQUAAulVBRhI1uk4EWXk1yIE"
        ];
        let index = Math.floor(Math.random() * stickers.length);
        bot.sendSticker(callback.message.chat.id, stickers[index])
            .then(message => deleteMessageTimeout(callback.message.chat.id, message.message_id, 5 * 1000));
    }

    if (randomPrize.name === "sword") {
        let sword = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
        foundSession.sword += sword;
        await sendPrizeMessage(callback, foundSession, sword, randomPrize.translatedName);
    }

    if (randomPrize.name === "brokenSword") {
        let sword = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
        foundSession.sword += sword;
        await sendPrizeMessage(callback, foundSession, sword, randomPrize.translatedName);
    }

    if (randomPrize.name === "immuneToUpSword") {
        foundSession.immuneToUpSword = true;
        await sendPrizeMessage(callback, foundSession, "", randomPrize.translatedName);
    }

    await editChest(randomPrize.name, button, foundSession, callback);
    await endChestSession(foundSession, callback);
}]];