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
import loadPlayer from '../../../functions/getters/loadPlayer.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import isBossAlive from '../../../functions/game/boss/getBossStatus/isBossAlive.js';
import skillUsagePayCost from '../../../functions/game/player/skillUsagePayCost.js';
import getTime from '../../../functions/getters/getTime.js';
import getChatSession from '../../../functions/getters/getChatSession.js';
import getMaxHp from '../../../functions/game/player/getters/getMaxHp.js';
import { getEffectiveSkillCost } from '../../../functions/game/player/skillEnchant.js';

export default [[/^skill\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, chatId, skillSlot]) {
    const { chat, member } = await loadPlayer(chatId, callback.from.id);
    if (!member) {
        return;
    }
    const skill = member.game.gameClass.skills[skillSlot];
    let aliveBoss = await getAliveBoss(chatId);
    let isCanBeUsed = isPlayerCanUseSkill(member, skill);

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

    let { cost, costHp } = getEffectiveSkillCost(skill);
    let costCount = costHp > 0 ? costHp : cost;
    let costType = costHp > 0 ? "hp" : "mp";

    skillUsagePayCost(member, costType, costCount);

    if (skill.isDealDamage) {
        let dealDamage = userDealDamage(member, aliveBoss, skill);
        if (dealDamage) {
            aliveBoss.markModified("listOfDamage");
            setSkillCooldown(skill, member);
            await chat.save();

            await sendMessageWithDelete(callback.message.chat.id, userDealDamageMessage(member, aliveBoss, dealDamage), {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 15 * 1000);

            if (!isBossAlive(aliveBoss)) {
                await deleteMessage(callback.message.chat.id, callback.message.message_id);
                let chatSession = await getChatSession(chatId);

                await deleteMessage(chatId, chatSession.bossMenuMessageId);

                aliveBoss.currentHp = 0;
                await aliveBoss.save();

                let loot = await bossSendLoot(aliveBoss, chatId);
                await sendMessageWithDelete(chatId, bossLootMessage(aliveBoss, loot), {
                    ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
                }, 25 * 1000);

                aliveBoss.skill = null;
                aliveBoss.currentHp = 0;
                aliveBoss.hp = 0;
                aliveBoss.listOfDamage = [];
                aliveBoss.markModified("skill");
                aliveBoss.markModified("listOfDamage");
            }

            await aliveBoss.save();
        }
        return;
    } else if (skill.isHeal) {
        let heal = useHealSkill(member, skill);
        member.game.gameClass.stats.hp = Math.min(member.game.gameClass.stats.hp + heal, getMaxHp(member, member.game.gameClass));

        await sendMessageWithDelete(callback.message.chat.id, `Ты восстановил себе ${heal} хп. Твоё текущее хп: ${getCurrentHp(member)}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 15 * 1000);
    } else if (skill.isShield) {
        let shield = useShieldSkill(member, skill);
        let shieldEffect = member.game.effects.find(effect => effect.name === "shield")

        if (!shieldEffect) {
            member.game.effects.push({name: "shield", value: shield, time: 0});
        } else {
            shieldEffect.value = shield;
        }

        await sendMessageWithDelete(callback.message.chat.id, `Ты наложил на себя щит равный ${shield} хп.`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 15 * 1000);
    }

    setSkillCooldown(skill, member);
    await chat.save();
}]];