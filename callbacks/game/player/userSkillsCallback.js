import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import userDealDamage from '../../../functions/game/player/userDealDamage.js';
import setSkillCooldown from '../../../functions/game/player/setSkillCooldown.js';
import getCurrentHp from '../../../functions/game/player/getters/getCurrentHp.js';
import userDealDamageMessage from '../../../functions/game/player/userDealDamageMessage.js';
import useHealSkill from '../../../functions/game/player/useHealSkill.js';
import useShieldSkill from '../../../functions/game/player/useShieldSkill.js';
import isPlayerCanUseSkill from '../../../functions/game/player/isPlayerCanUseSkill.js';
import isPlayerCanUseSkillMessage from '../../../functions/game/player/isPlayerCanUseSkillMessage.js';
import bossSendLoot from '../../../functions/game/boss/bossSendLoot.js';
import bossLootMessage from '../../../functions/game/boss/bossLootMessage.js';
import getAliveBoss from '../../../functions/game/boss/getBossStatus/getAliveBoss.js';
import getMembers from '../../../functions/getters/getMembers.js';
import getSession from '../../../functions/getters/getSession.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import isBossAlive from '../../../functions/game/boss/getBossStatus/isBossAlive.js';
import skillUsagePayCost from '../../../functions/game/player/skillUsagePayCost.js';
import getTime from '../../../functions/getters/getTime.js';
import getChatSession from '../../../functions/getters/getChatSession.js';
import getMaxHp from '../../../functions/game/player/getters/getMaxHp.js';

export default [[/^skill\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, chatId, skillSlot]) {
    let foundSession = await getSession(chatId, callback.from.id);
    const skill = foundSession.game.gameClass.skills[skillSlot];
    let members = getMembers(chatId);
    let aliveBoss = getAliveBoss(chatId);
    let isCanBeUsed = isPlayerCanUseSkill(foundSession, skill);

    if (isCanBeUsed !== 0) {
        await sendMessageWithDelete(callback.message.chat.id, isPlayerCanUseSkillMessage(isCanBeUsed, skill), {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
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
                await sendMessageWithDelete(callback.message.chat.id, userDealDamageMessage(foundSession, aliveBoss, dealDamage), {
                    ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
                }, 15 * 1000);

                if (!isBossAlive(aliveBoss)) {
                    await deleteMessage(callback.message.chat.id, callback.message.message_id);
                    let chatSession = getChatSession(chatId);

                    await deleteMessage(chatId, chatSession.bossMenuMessageId);
                    let loot = bossSendLoot(aliveBoss, members);
                    await sendMessageWithDelete(chatId, bossLootMessage(aliveBoss, loot), {
                        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
                    }, 25 * 1000);

                    aliveBoss.skill = null;
                    aliveBoss.currentHp = 0;
                    aliveBoss.hp = 0;
                    aliveBoss.listOfDamage = [];
                }
            }
        } else if (skill.isHeal) {
            let heal = useHealSkill(foundSession, skill);
            foundSession.game.gameClass.stats.hp = Math.max(foundSession.game.gameClass.stats.hp + heal, getMaxHp(foundSession, foundSession.game.gameClass));

            await sendMessageWithDelete(callback.message.chat.id, `Ты восстановил себе ${heal} хп. Твоё текущее хп: ${getCurrentHp(foundSession)}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 15 * 1000);
        } else if (skill.isShield) {
            let shield = useShieldSkill(foundSession, skill);
            let shieldEffect = foundSession.game.effects.find(effect => effect.name === "shield")

            if (!shieldEffect) {
                foundSession.game.effects.push({name: "shield", value: shield, time: 0});
            } else {
                shieldEffect.value = shield;
            }

            await sendMessageWithDelete(callback.message.chat.id, `Ты наложил на себя щит равный ${shield} хп.`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 15 * 1000);
        }

        setSkillCooldown(skill, foundSession);
    } else {
        await sendMessageWithDelete(callback.message.chat.id, "Что-то пошло не так при попытке нанести урон.", {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 15 * 1000);
    }
}]];