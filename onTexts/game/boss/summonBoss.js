const bot = require('../../../bot');
const {bosses} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const getMembers = require('../../../functions/getMembers');
const summonBoss = require('../../../functions/boss/summonBoss');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const debugMessage = require('../../../functions/debugMessage');

function getOffset() {
    return new Date().getTime() + 2 * 60 * 60 * 1000;
}

function bossRegenHp (boss, chatId) {
    boss.damagedHp -= 500;
    sendMessage(chatId, `Босс восстановил себе 500хп. Его текущее хп: ${boss.hp - boss.damagedHp}`);
    boss.hpRegenTimeout = getOffset();
}

module.exports = [[/(?:^|\s)\/summon_boss\b/, async (msg) => {
    try {
        let currentTime = new Date().getTime();
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let members = getMembers(msg.chat.id);
        let boss = bosses[msg.chat.id];

        sendMessage(msg.chat.id, `${await summonBoss(msg.chat.id, bosses, members)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 10000));

        if (boss.skill.effect === "hp_regen" && (!boss.hpRegenTimeout || boss.hpRegenTimeout === 0)) {
            setTimeout(() => bossRegenHp(), 2 * 60 * 60 * 1000);
        } else if (boss.hpRegenTimeout < currentTime) {
            boss.hpRegenTimeout = 0;
        }

    } catch (e) {
        debugMessage(`Command: /summon_boss\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];