const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const userDealDamage = require('../../../functions/game/player/userDealDamage');
const setSkillCooldown = require('../../../functions/game/player/setSkillCooldown');
const getCurrentHp = require('../../../functions/game/player/getters/getCurrentHp');
const userDealDamageMessage = require('../../../functions/game/player/userDealDamageMessage');
const userHealSkill = require('../../../functions/game/player/userHealSkill');
const userShieldSkill = require('../../../functions/game/player/userShieldSkill');
const isPlayerCanUseSkill = require('../../../functions/game/player/isPlayerCanUseSkill');
const isPlayerCanUseSkillMessage = require('../../../functions/game/player/isPlayerCanUseSkillMessage');
const bossSendLoot = require('../../../functions/game/boss/bossSendLoot');
const bossLootMessage = require('../../../functions/game/boss/bossLootMessage');
const getAliveBoss = require('../../../functions/game/boss/getBossStatus/getAliveBoss');
const getMembers = require('../../../functions/getters/getMembers');
const deleteMessage = require('../../../functions/tgBotFunctions/deleteMessage');
const isBossAlive = require("../../../functions/game/boss/getBossStatus/isBossAlive");
const skillUsagePayCost = require('../../../functions/game/player/skillUsagePayCost');
const checkUserCall = require("../../../functions/misc/checkUserCall");
const getTime = require("../../../functions/getters/getTime");

module.exports = [[/^skill\.[0-9]+$/, async function (session, callback) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    const [, skillSlot] = callback.data.match(/^skill\.([0-9]+)$/);
    const skill = session.game.gameClass.skills[skillSlot];
    let members = getMembers(callback.message.chat.id);
    let aliveBoss = getAliveBoss(callback.message.chat.id);
    let isCanBeUsed = isPlayerCanUseSkill(session, skill);

    if (isCanBeUsed !== 0) {
        return sendMessageWithDelete(callback.message.chat.id, isPlayerCanUseSkillMessage(isCanBeUsed, skill), {}, 10 * 1000);
    }

    let [remain] = getTime(skill.cooldownReceive);
    if (remain > 0) {
        return;
    }

    if (isCanBeUsed === 0) {
        let costCount = skill.costHp > 0 ? skill.costHp : skill.cost;
        let costType = skill.costHp > 0 ? "hp" : "mp";

        skillUsagePayCost(session, costType, costCount);
        if (skill.isDealDamage) {
            let dealDamage = userDealDamage(session, aliveBoss, skill);
            if (dealDamage) {
                aliveBoss = getAliveBoss(callback.message.chat.id);
                await sendMessageWithDelete(callback.message.chat.id, userDealDamageMessage(session, aliveBoss, dealDamage), {}, 15 * 1000);

                if (!isBossAlive(aliveBoss)) {
                    await deleteMessage(callback.message.chat.id, callback.message.message_id);
                    let loot = bossSendLoot(aliveBoss, members);
                    await sendMessageWithDelete(callback.message.chat.id, bossLootMessage(aliveBoss, loot), {}, 25 * 1000);

                    aliveBoss.skill = null;
                    aliveBoss.currentHp = 0;
                    aliveBoss.hp = 0;
                    aliveBoss.listOfDamage = [];
                }
            }
        } else if (skill.isHeal) {
            let heal = userHealSkill(session, skill);
            session.game.gameClass.stats.hp += heal;

            await sendMessageWithDelete(callback.message.chat.id, `Ты восстановил себе ${heal} хп. Твоё текущее хп: ${getCurrentHp(session)}`, {}, 15 * 1000);
        } else if (skill.isShield) {
            let shield = userShieldSkill(session, skill);
            let shieldEffect = session.game.effects.find(effect => effect.name === "shield")

            if (!shieldEffect) {
                session.game.effects.push({name: "shield", value: shield, time: 0});
            } else {
                shieldEffect.value = shield;
            }

            await sendMessageWithDelete(callback.message.chat.id, `Ты наложил на себя щит равный ${shield} хп.`, {},15 * 1000);
        }

        setSkillCooldown(skill, session);
    } else {
        await sendMessageWithDelete(callback.message.chat.id, "Что-то пошло не так при попытке нанести урон.", {},15 * 1000);
    }
}]];