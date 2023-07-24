const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getBoss = require('../../../functions/game/boss/getBossStatus/getAliveBoss');
const bossAlreadySummoned = require('../../../functions/game/boss/getBossStatus/bossAlreadySummoned');

module.exports = [[/(?:^|\s)\/boss\b/, async (msg) => {
    let chatId = msg.chat.id;
    await deleteMessage(chatId, msg.message_id);
    let keyboard = [];
    let boss = getBoss(chatId);

    let isAlreadyCalled = bossAlreadySummoned(boss);
    if (!isAlreadyCalled) {
        keyboard.push([{
            text: "Призвать босса",
            callback_data: `boss.summon`
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

    return sendMessage(chatId, "Выбери необходимое действие", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...keyboard, [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];