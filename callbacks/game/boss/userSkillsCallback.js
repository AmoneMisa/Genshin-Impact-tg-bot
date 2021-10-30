const sendMessage = require('../../../functions/sendMessage');
const bot = require('../../../bot');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const userDealDamage = require('../../../functions/game/boss/userDealDamage');
const userHealSkill = require('../../../functions/game/boss/userHealSkill');
const userShieldSkill = require('../../../functions/game/boss/userShieldSkill');
const userBuffSkill = require('../../../functions/game/boss/userBuffSkill');
const setSkillCooltime = require('../../../functions/game/boss/setSkillCooltime');
const bossGetLoot = require('../../../functions/game/boss/bossGetLoot');
const getMembers = require('../../../functions/getMembers');
const {bosses} = require('../../../data');

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
        if (setSkillCooltime(skill)) {
            if (userDealDamage(session, boss, callbackSendMessage, skill)) {
                bossGetLoot(boss, members, callbackSendMessage);

                // if (boss.hasOwnProperty("setIntervalId")) {
                //     clearInterval(boss.setIntervalId);
                //     delete boss.setIntervalId;
                // }
                //
                // clearInterval(boss.setAttackIntervalId);
                // delete boss.setAttackIntervalId;
            }
        } else {
            sendMessage(callback.message.chat.id, `Данный скилл в кд.`);
        }
    } else if (skill.effect.includes("heal")) {
        if (setSkillCooltime(skill)) {
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
        if (setSkillCooltime(skill)) {

            let shield = userShieldSkill(session, skill);
            session.game.boss.shield = shield;
            session.game.boss.skillTimers = {name: skill.name, cooltime: skill.cooltime};

            sendMessage(callback.message.chat.id, `Ты наложил на себя щит равный ${shield} хп.`);
        } else {
            sendMessage(callback.message.chat.id, `Данный скилл в кд.`);
        }
    } else if (skill.isBuff) {
        if (setSkillCooltime(skill)) {

            let {buffType, amount} = userBuffSkill(session, skill);
            session.game.gameClass.stats[buffType] += amount;

            if (session.game.gameClass.stats.criticalChance > 100) {
                session.game.gameClass.stats.criticalChance = 100;
            }

            setSkillCooltime(skill);
            sendMessage(callback.message.chat.id, `Ты наложил на себя бафф ${skill.name} - ${skill.description}. Время действия: ${skill.time} ход(-а|-ов)`);
        }
    } else {
        sendMessage(callback.message.chat.id, `Данный скилл в кд.`);
    }
}]];