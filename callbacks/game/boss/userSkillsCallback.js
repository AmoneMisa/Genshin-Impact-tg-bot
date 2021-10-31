const sendMessage = require('../../../functions/sendMessage');
const bot = require('../../../bot');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const userDealDamage = require('../../../functions/game/boss/userDealDamage');
const userHealSkill = require('../../../functions/game/boss/userHealSkill');
const userShieldSkill = require('../../../functions/game/boss/userShieldSkill');
const userBuffSkill = require('../../../functions/game/boss/userBuffSkill');
const isPlayerCanUseSkill = require('../../../functions/game/boss/isPlayerCanUseSkill');
const bossGetLoot = require('../../../functions/game/boss/bossGetLoot');
const getMembers = require('../../../functions/getMembers');
const {bosses} = require('../../../data');
const getTime = require('../../../functions/getTime');

function getOffset(time) {
    return new Date().getTime() + time;
}

module.exports = [[/^skill\.[0-9]+$/, function (session, callback) {
    bot.deleteMessage(callback.message.chat.id, callback.message.message_id);

    if (!callback.message.text.includes(session.userChatData.user.username)) {
        return;
    }

    const [, skillSlot] = callback.data.match(/^skill\.([0-9]+)$/);
    const skill = session.game.gameClass.skills[skillSlot];
    let members = getMembers(callback.message.chat.id);

    let boss = bosses[callback.message.chat.id];

    let callbackSendMessage = (message) => sendMessage(callback.message.chat.id, message, {
        disable_notification: true
    }).then(message => deleteMessageTimeout(callback.message.chat.id, message.message_id, 10 * 60 * 1000));

    if (skill.isDealDamage) {
        if (isPlayerCanUseSkill(skill)) {
            if (userDealDamage(session, boss, callbackSendMessage, skill)) {
                bossGetLoot(boss, members, callbackSendMessage);
            }
        } else {
            sendMessage(callback.message.chat.id, `Данный скилл в кд.`);
        }
    } else if (skill.effect.includes("heal")) {
        if (isPlayerCanUseSkill(skill)) {
            let heal = userHealSkill(session, skill);
            session.game.boss.damagedHp -= heal;

            if (session.game.boss.damagedHp <= session.game.boss.damagedHp && session.game.boss.damagedHp < 0) {
                session.game.boss.damagedHp = 0;
            }
            sendMessage(callback.message.chat.id, `Ты восстановил себе ${heal} хп. Твоё текущее хп: ${session.game.boss.hp - session.game.boss.damagedHp}`);
        } else {
            sendMessage(callback.message.chat.id, `Данный скилл в кд.`);
        }
    } else if (skill.effect.includes("shield")) {
        if (isPlayerCanUseSkill(skill)) {

            let shield = userShieldSkill(session, skill);
            session.game.boss.shield = shield;

            sendMessage(callback.message.chat.id, `Ты наложил на себя щит равный ${shield} хп.`);
        } else {
            sendMessage(callback.message.chat.id, `Данный скилл в кд.`);
        }
    } else if (skill.isBuff) {
        if (isPlayerCanUseSkill(skill)) {
            let {buffType, amount} = userBuffSkill(session, skill);
            skill.timeReceive = skill.timeReceive || getOffset(skill.time);
            let [remain, hours, minutes, seconds] = getTime(skill.timeReceive);

            if (remain > 0) {
                if (hours > 0) {
                    sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, ты уже наложил на себя бафф ${skill.name} - ${skill.description}. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`);
                } else if (minutes > 0) {
                    sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, ты уже наложил на себя бафф ${skill.name} - ${skill.description}. Осталось: ${minutes} мин ${seconds} сек`);
                } else {
                    sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, ты уже наложил на себя бафф ${skill.name} - ${skill.description}. Осталось: ${seconds} сек`);
                }
                return;
            }

            session.game.gameClass.stats[buffType] += amount;

            if (session.game.gameClass.stats.criticalChance > 100) {
                session.game.gameClass.stats.criticalChance = 100;
            }

            setTimeout(() => session.game.gameClass.stats[buffType] -= amount, getOffset(skill.time));

            sendMessage(callback.message.chat.id, `Ты наложил на себя бафф ${skill.name} - ${skill.description}. Время действия: ${skill.time} час(-а|-ов)`);
        }
    } else {
        sendMessage(callback.message.chat.id, `Данный скилл в кд.`);
    }


}]];