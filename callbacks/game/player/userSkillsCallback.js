const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const userDealDamage = require('../../../functions/game/player/userDealDamage');
const setSkillCooldown = require('../../../functions/game/player/setSkillCooldown');
const getCurrentHp = require('../../../functions/game/player/getters/getCurrentHp');
const userDealDamageMessage = require('../../../functions/game/player/userDealDamageMessage');
const useHealSkill = require('../../../functions/game/player/useHealSkill');
const useShieldSkill = require('../../../functions/game/player/useShieldSkill');
const isPlayerCanUseSkill = require('../../../functions/game/player/isPlayerCanUseSkill');
const isPlayerCanUseSkillMessage = require('../../../functions/game/player/isPlayerCanUseSkillMessage');
const bossSendLoot = require('../../../functions/game/boss/bossSendLoot');
const bossLootMessage = require('../../../functions/game/boss/bossLootMessage');
const getAliveBoss = require('../../../functions/game/boss/getBossStatus/getAliveBoss');
const getMembers = require('../../../functions/getters/getMembers');
const getSession = require('../../../functions/getters/getSession');
const deleteMessage = require('../../../functions/tgBotFunctions/deleteMessage');
const isBossAlive = require("../../../functions/game/boss/getBossStatus/isBossAlive");
const skillUsagePayCost = require('../../../functions/game/player/skillUsagePayCost');
const getTime = require("../../../functions/getters/getTime");
const getChatSession = require("../../../functions/getters/getChatSession");
const getMaxHp = require("../../../functions/game/player/getters/getMaxHp");

module.exports = [[/^skill\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, chatId, skillSlot]) {
    let foundSession = await getSession(chatId, callback.from.id);
    const skill = foundSession.game.gameClass.skills[skillSlot];
    let members = getMembers(chatId);
    let aliveBoss = getAliveBoss(chatId);
    let isCanBeUsed = isPlayerCanUseSkill(foundSession, skill);

    if (isCanBeUsed !== 0) {
        await sendMessageWithDelete(callback.message.chat.id, isPlayerCanUseSkillMessage(isCanBeUsed, skill), {}, 10 * 1000);
        return;
    }

    let [remain] = getTime(skill.cooldownReceive);
    if (remain > 0) {
        return;
    }

    if (isCanBeUsed === 0) {
        let costCount = skill.costHp > 0 ? skill.costHp : skill.cost;
        let costType = skill.costHp > 0 ? "hp" : "mp";

        skillUsagePayCost(foundSession, costType, costCount);
        if (skill.isDealDamage) {
            let dealDamage = userDealDamage(foundSession, aliveBoss, skill);
            if (dealDamage) {
                aliveBoss = getAliveBoss(chatId);
                await sendMessageWithDelete(callback.message.chat.id, userDealDamageMessage(foundSession, aliveBoss, dealDamage), {}, 15 * 1000);

                if (!isBossAlive(aliveBoss)) {
                    await deleteMessage(callback.message.chat.id, callback.message.message_id);
                    let chatSession = getChatSession(chatId);

                    await deleteMessage(chatId, chatSession.bossMenuMessageId);
                    let loot = bossSendLoot(aliveBoss, members);
                    await sendMessageWithDelete(chatId, bossLootMessage(aliveBoss, loot), {}, 25 * 1000);

                    aliveBoss.skill = null;
                    aliveBoss.currentHp = 0;
                    aliveBoss.hp = 0;
                    aliveBoss.listOfDamage = [];
                }
            }
        } else if (skill.isHeal) {
            let heal = useHealSkill(foundSession, skill);
            foundSession.game.gameClass.stats.hp = Math.max(foundSession.game.gameClass.stats.hp + heal, getMaxHp(foundSession, foundSession.game.gameClass));

            await sendMessageWithDelete(callback.message.chat.id, `Ты восстановил себе ${heal} хп. Твоё текущее хп: ${getCurrentHp(foundSession)}`, {}, 15 * 1000);
        } else if (skill.isShield) {
            let shield = useShieldSkill(foundSession, skill);
            let shieldEffect = foundSession.game.effects.find(effect => effect.name === "shield")

            if (!shieldEffect) {
                foundSession.game.effects.push({name: "shield", value: shield, time: 0});
            } else {
                shieldEffect.value = shield;
            }

            await sendMessageWithDelete(callback.message.chat.id, `Ты наложил на себя щит равный ${shield} хп.`, {}, 15 * 1000);
        }

        setSkillCooldown(skill, foundSession);
    } else {
        await sendMessageWithDelete(callback.message.chat.id, "Что-то пошло не так при попытке нанести урон.", {}, 15 * 1000);
    }
}]];