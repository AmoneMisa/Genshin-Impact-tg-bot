const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const scheduleSendMessage = require('../../../functions/tgBotFunctions/scheduleSendMessage');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const userDealDamage = require('../../../functions/game/player/userDealDamage');
const setSkillCooltime = require('../../../functions/game/player/setSkillCooltime');
const userDealDamageMessage = require('../../../functions/game/player/userDealDamageMessage');
const userHealSkill = require('../../../functions/game/player/userHealSkill');
const userShieldSkill = require('../../../functions/game/player/userShieldSkill');
const isPlayerCanUseSkill = require('../../../functions/game/player/isPlayerCanUseSkill');
const isPlayerCanUseSkillMessage = require('../../../functions/game/player/isPlayerCanUseSkillMessage');
const bossSendLoot = require('../../../functions/game/boss/bossSendLoot');
const bossLootMessage = require('../../../functions/game/boss/bossLootMessage');
const getAliveBoss = require('../../../functions/game/boss/getBossStatus/getAliveBoss');
const getMembers = require('../../../functions/getters/getMembers');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require('../../../functions/tgBotFunctions/deleteMessage');
const isBossAlive = require("../../../functions/game/boss/getBossStatus/isBossAlive");
const notificationMessagesDictionary = require("../../../dictionaries/notificationMessagesDictionary");

function getOffset() {
    // return new Date().getTime() + 2 * 60 * 1000;
    return new Date().getTime() + 2 * 1000;
}

module.exports = [[/^skill\.[0-9]+$/, async function (session, callback) {
    await deleteMessage(callback.message.chat.id, callback.message.message_id);

    if (!callback.message?.text?.includes(getUserName(session, "nickname")) && !callback?.message?.caption?.includes(getUserName(session, "nickname"))) {
        return;
    }

    const [, skillSlot] = callback.data.match(/^skill\.([0-9]+)$/);
    const skill = session.game.gameClass.skills[skillSlot];
    let members = getMembers(callback.message.chat.id);
    let aliveBoss = getAliveBoss(callback.message.chat.id);
    let isCanBeUsed = isPlayerCanUseSkill(session, skill);
    let messageId = null;
    if (typeof isCanBeUsed === "number") {
        return sendMessageWithDelete(callback.message.chat.id, isPlayerCanUseSkillMessage(isCanBeUsed, skill), {}, 10 * 1000);
    }

    if (isCanBeUsed) {
        if (skill.isDealDamage) {
            let dealDamage = userDealDamage(session, aliveBoss, skill);
            if (dealDamage) {
                aliveBoss = getAliveBoss(callback.message.chat.id);
                await sendMessageWithDelete(callback.message.chat.id, userDealDamageMessage(session, aliveBoss, dealDamage), {}, 150 * 1000);

                if (!isBossAlive(aliveBoss)) {
                    let loot = bossSendLoot(aliveBoss, members);
                    await sendMessageWithDelete(callback.message.chat.id, bossLootMessage(aliveBoss, loot), {}, 25 * 1000);
                    clearInterval(session.timerDealDamageCallback);
                    clearInterval(aliveBoss.attackIntervalId);
                    session.timerDealDamageCallback = null;
                    aliveBoss.attackIntervalId = null;

                    if (aliveBoss.skill.effect === "hp_regen" && aliveBoss.hpRegenIntervalId) {
                        clearInterval(aliveBoss.hpRegenIntervalId);
                        aliveBoss.hpRegenIntervalId = null;
                    }

                    aliveBoss.skill = null;
                    aliveBoss.currentHp = 0;
                    aliveBoss.hp = 0;
                    aliveBoss.listOfDamage = [];
                }
            }
        } else if (skill.isHeal) {
            let heal = userHealSkill(session, skill);
            session.game.gameClass.stats.hp += heal;

            if (session.game.gameClass.stats.hp < 0) {
                session.game.gameClass.stats.hp = 0;
            }

            sendMessage(callback.message.chat.id, `Ты восстановил себе ${heal} хп. Твоё текущее хп: ${session.game.gameClass.stats.hp}`)
                .then(message => messageId = message.message_id);
        } else if (skill.isShield) {
            let shield = userShieldSkill(session, skill);
            let shieldEffect = session.game.effects.find(effect => effect.name === "shield")

            if (!shieldEffect) {
                session.game.effects.push({name: "shield", value: shield, time: 0});
            } else {
                shieldEffect.value = shield;
            }

            sendMessage(callback.message.chat.id, `Ты наложил на себя щит равный ${shield} хп.`)
                .then(message => messageId = message.message_id);
        }
        
        session.timerDealDamageCallback = getOffset();
        scheduleSendMessage(session.userChatData.user.id,
            `@${getUserName(session, "nickname")}, ${notificationMessagesDictionary["boss"].playerCanDealDamage}`,
            {},
            session.timerDealDamageCallback);

        for (let _skill of session.game.gameClass.skills) {
            if (_skill.cooltimeReceive > 0) {
                _skill.cooltimeReceive--;
            }
        }

        setSkillCooltime(skill);
    } else {
        sendMessage(callback.message.chat.id, "Что-то пошло не так при попытке нанести урон.")
            .then(message => messageId = message.message_id);
    }

    deleteMessageTimeout(callback.message.chat.id, messageId, 15 * 1000);
}]];