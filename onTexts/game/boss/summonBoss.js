const {bosses} = require('../../../data');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const getMembers = require('../../../functions/getters/getMembers');
const summonBoss = require('../../../functions/game/boss/summonBoss');
const initHpRegen = require('../../../functions/game/boss/initHpRegen');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/summon_boss\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let members = getMembers(msg.chat.id);

    sendMessage(msg.chat.id, `${await summonBoss(msg.chat.id, bosses, members)}`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 10000));

    let boss = bosses[msg.chat.id];

    initHpRegen(msg.chat.id);
    boss.stats.currentSummons++;
}]];