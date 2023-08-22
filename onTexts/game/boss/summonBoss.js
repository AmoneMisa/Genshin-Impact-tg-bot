const sendPhoto = require('../../../functions/tgBotFunctions/sendPhoto');
const buttonsDictionary = require('../../../dictionaries/buttons');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getBoss = require('../../../functions/game/boss/getBossStatus/getAliveBoss');
const bossAlreadySummoned = require('../../../functions/game/boss/getBossStatus/bossAlreadySummoned');
const summonBoss = require('../../../functions/game/boss/summonBoss');
const getLocalImageByPath = require("../../../functions/getters/getLocalImageByPath");
const summonBossMessage = require("../../../functions/game/boss/summonBossMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const getChatSession = require("../../../functions/getters/getChatSession");

module.exports = [[/(?:^|\s)\/boss\b/, async (msg) => {
    let chatId = msg.chat.id;
    await deleteMessage(chatId, msg.message_id);
    let boss = getBoss(chatId);

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

    if (!bossAlreadySummoned(boss)) {
        boss = await summonBoss(chatId);
    }

    let chatSession = getChatSession(chatId);


    let imagePath = getLocalImageByPath(boss.stats.lvl, `bosses/${boss.name}`);
    if (imagePath) {
        sendPhoto(msg.chat.id, imagePath, {
            caption: `${summonBossMessage(chatId, boss, false)}`,
            reply_markup: {
                inline_keyboard: [...keyboard, [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        }).then(message => chatSession.bossMenuMessageId = message.message_id);
        return;
    }

    sendMessage(msg.chat.id, `${summonBossMessage(chatId, boss, false)}`, {
        reply_markup: {
            inline_keyboard: [...keyboard, [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }).then(message => chatSession.bossMenuMessageId = message.message_id);
}]];