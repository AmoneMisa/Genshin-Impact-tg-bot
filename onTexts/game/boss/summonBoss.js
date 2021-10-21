const bot = require('../../../bot');
const {bosses} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const getMembers = require('../../../functions/getMembers');
const summonBoss = require('../../../functions/game/boss/summonBoss');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const debugMessage = require('../../../functions/debugMessage');

function bossRegenHp(boss, chatId) {
    boss.damagedHp -= Math.ceil(boss.hp * 0.08);
    sendMessage(chatId, `Босс восстановил себе хп. Его текущее хп: ${boss.hp - boss.damagedHp}`);
}

module.exports = [[/(?:^|\s)\/summon_boss\b/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
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
        if (boss.skill.effect === "hp_regen" && !boss.setIntervalId) {
            boss.setIntervalId = setInterval(() => bossRegenHp(boss, msg.chat.id), 60 * 60 * 1000);
        }

    } catch (e) {
        debugMessage(`Command: /summon_boss\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];