const sendMessage = require('../../../functions/sendMessage');
const bot = require('../../../bot');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const userDealDamage = require('../../../functions/game/player/userDealDamage');
const userHealSkill = require('../../../functions/game/player/userHealSkill');
const userShieldSkill = require('../../../functions/game/player/userShieldSkill');
const isPlayerCanUseSkill = require('../../../functions/game/player/isPlayerCanUseSkill');
const bossGetLoot = require('../../../functions/game/boss/bossGetLoot');
const getMembers = require('../../../functions/getMembers');
const {bosses} = require('../../../data');

function getOffset() {
    // return new Date().getTime() + 60 * 60 * 1000;
    return new Date().getTime() + 10 * 1000;
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

    let {isCanBeUsed, message} = isPlayerCanUseSkill(session, skill);

    if (isCanBeUsed) {
        if (skill.isDealDamage) {
            if (userDealDamage(session, boss, callbackSendMessage, skill)) {
                bossGetLoot(boss, members, callbackSendMessage);
                clearInterval(boss.timerBossCallback);
                clearInterval(boss.attackIntervalId);
                session.timerBossCallback = null;
                boss.attackIntervalId = null;
                boss.isDead = true;
            }
        } else if (skill.isHeal) {
            let heal = userHealSkill(session, skill);
            session.game.boss.damagedHp -= heal;

            if (session.game.boss.damagedHp <= session.game.boss.damagedHp && session.game.boss.damagedHp < 0) {
                session.game.boss.damagedHp = 0;
            }

            sendMessage(callback.message.chat.id, `Ты восстановил себе ${heal} хп. Твоё текущее хп: ${session.game.boss.hp - session.game.boss.damagedHp}`);
        } else if (skill.isShield) {
            let shield = userShieldSkill(session, skill);
            session.game.boss.shield = shield;

            sendMessage(callback.message.chat.id, `Ты наложил на себя щит равный ${shield} хп.`);
        }
        session.timerBossCallback = getOffset();

        for (let skill of session.game.gameClass.skills) {
            if (skill.cooltimeReceive > 0) {
                skill.cooltimeReceive--;
            }
        }

    } else {
        sendMessage(callback.message.chat.id, message);
    }
}]];