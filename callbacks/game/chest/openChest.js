const getRandom = require('../../../functions/getters/getRandom');
const setLevel = require('../../../functions/game/player/setLevel');
const getRandomChest = require('../../../functions/game/chest/getRandomChest');
const endChestSession = require('../../../functions/game/chest/endChestSession');
const sendPrizeMessage = require('../../../functions/game/chest/sendPrizeMessage');
const editChest = require('../../../functions/game/chest/editChest');
const bot = require('../../../bot');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const getUserName = require('../../../functions/getters/getUserName');

let prizes = [{
    name: "experience",
    minAmount: 100,
    maxAmount: 650,
    from: 0,
    chance: 15
}, {
    name: "gold",
    minAmount: 100,
    maxAmount: 1500,
    from: 15,
    chance: 20
}, {
    name: "crystal",
    minAmount: 10,
    maxAmount: 150,
    from: 35,
    chance: 10
}, {
    name: "nothing",
    from: 45,
    chance: 30
}, {
    name: "sword",
    minAmount: 1,
    maxAmount: 10,
    from: 75,
    chance: 10
}, {
    name: "brokenSword",
    minAmount: -1,
    maxAmount: -10,
    from: 85,
    chance: 5
}, {
    name: "immuneToUpSword",
    from: 90,
    chance: 10
}];

module.exports = [[/^chest_[0-9]+$/, function (session, callback) {
    const [chest] = callback.data.match(/^chest_[0-9]+$/);
    session.chestCounter = session.chestCounter || 0;
    session.chosenChests = session.chosenChests || [];

    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    if (session.chosenChests.includes(chest)) {
        return;
    }

    if (!session.chestButtons || !session.chestButtons.length) {
        session.chestButtons = getRandomChest();
    }

    let randomPrize;
    let randomInt = getRandom(0, 99);
    for (let prize of prizes) {
        if (prize.from <= randomInt && randomInt < prize.from + prize.chance) {
            randomPrize = prize;
        }
    }

    for (let buttonsArray of session.chestButtons) {
        for (let button of buttonsArray) {
            if (button.callback_data.includes(chest)) {
                if (randomPrize.name === "gold") {
                    let gold = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
                    session.game.inventory.gold += gold;
                    editChest("💸", buttonsArray, button, session, callback);
                    endChestSession(session, callback);
                    sendPrizeMessage(callback, session, gold, "золота");
                }

                if (randomPrize.name === "crystal") {
                    let crystal = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
                    session.game.inventory.crystals += crystal;
                    editChest("💎", buttonsArray, button, session, callback);
                    endChestSession(session, callback);
                    sendPrizeMessage(callback, session, crystal, "кристаллов");
                }

                if (randomPrize.name === "experience") {
                    let experience = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
                    session.game.stats.currentExp += experience;
                    setLevel(session);
                    editChest("📖", buttonsArray, button, session, callback);
                    endChestSession(session, callback);
                    sendPrizeMessage(callback, session, experience, "опыта");
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
                    editChest("💩", buttonsArray, button, session, callback);
                    endChestSession(session, callback);
                    return bot.sendSticker(callback.message.chat.id, stickers[index])
                        .then(message => deleteMessageTimeout(callback.message.chat.id, message.message_id, 5000));
                }

                if (randomPrize.name === "sword") {
                    let sword = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
                    session.sword += sword;
                    editChest("🗡", buttonsArray, button, session, callback);
                    endChestSession(session, callback);
                    sendPrizeMessage(callback, session, sword, "мм меча");
                }

                if (randomPrize.name === "brokenSword") {
                    let sword = getRandom(randomPrize.minAmount, randomPrize.maxAmount);
                    session.sword += sword;
                    editChest("🪠", buttonsArray, button, session, callback);
                    endChestSession(session, callback);
                    sendPrizeMessage(callback, session, sword, "мм меча");
                }

                if (randomPrize.name === "immuneToUpSword") {
                    session.immuneToUpSword = true;
                    editChest("⤵", buttonsArray, button, session, callback, "иммунитет к увеличению меча");
                    endChestSession(session, callback);
                    sendPrizeMessage(callback, session, "", "иммунитет к увеличению меча");
                }
            }
        }
    }
}]];