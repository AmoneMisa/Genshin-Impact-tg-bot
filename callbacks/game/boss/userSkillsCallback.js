const sendMessage = require('../../../functions/sendMessage');
const bot = require('../../../bot');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const userDealDamage = require('../../../functions/game/boss/userDealDamage');
const userHealSkill = require('../../../functions/game/boss/userHealSkill');
const userShieldSkill = require('../../../functions/game/boss/userShieldSkill');
const isPlayerCanUseSkill = require('../../../functions/game/boss/isPlayerCanUseSkill');
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
        if (isPlayerCanUseSkill(session, skill)) {
            if (userDealDamage(session, boss, callbackSendMessage, skill)) {
                bossGetLoot(boss, members, callbackSendMessage);
            }
        } else {
            let {message} = isPlayerCanUseSkill(session, skill);
            sendMessage(callback.message.chat.id, message);
        }
    } else if (skill.effect.includes("heal")) {
        if (isPlayerCanUseSkill(session, skill)) {
            let heal = userHealSkill(session, skill);
            session.game.boss.damagedHp -= heal;

            if (session.game.boss.damagedHp <= session.game.boss.damagedHp && session.game.boss.damagedHp < 0) {
                session.game.boss.damagedHp = 0;
            }
            sendMessage(callback.message.chat.id, `Ты восстановил себе ${heal} хп. Твоё текущее хп: ${session.game.boss.hp - session.game.boss.damagedHp}`);
        } else {
            let {message} = isPlayerCanUseSkill(session, skill);
            sendMessage(callback.message.chat.id, message);
        }
    } else if (skill.effect.includes("shield")) {
        if (isPlayerCanUseSkill(session, skill)) {
            let shield = userShieldSkill(session, skill);
            session.game.boss.shield = shield;

            sendMessage(callback.message.chat.id, `Ты наложил на себя щит равный ${shield} хп.`);
        } else {
            let {message} = isPlayerCanUseSkill(session, skill);
            sendMessage(callback.message.chat.id, message);
        }
    }
}]];