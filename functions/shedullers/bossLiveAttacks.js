import {withLock} from '../general/chatLock.js';
import {tickSoulDots} from '../game/equipment/soulCrystalCombat.js';
import {bossDebuffAmount} from '../game/boss/bossDebuffs.js';
import bossSendLoot from '../game/boss/bossSendLoot.js';
import Boss from '../../db/models/Boss.js';
import Chat from '../../db/models/Chat.js';
import bossCastAttack, { bossAttackMessage, minionCasts, nextAttackDelay } from '../game/boss/bossCastAttack.js';
import { isBossStunned } from '../game/boss/bossDebuffs.js';
import sendMessageWithDelete from '../tgBotFunctions/sendMessageWithDelete.js';

/**
 * Live boss combat: every alive boss casts one of its attacks every few
 * seconds on the fighters who joined the raid (anyone who hit it), and its
 * minions (partners, heads, adds) strike on their own timers. A stunned boss
 * skips its cast - its minions do not. Runs from the per-second scheduler;
 * bosses wait for their own `nextAttackAt`.
 */
export default async function bossLiveAttacks(now = Date.now()) {
    const bosses = await Boss.find({
        hp: { $gt: 0 },
        currentHp: { $gt: 0 },
        aliveTime: { $gt: now },
        $or: [{ nextAttackAt: { $exists: false } }, { nextAttackAt: null }, { nextAttackAt: { $lte: now } }],
    });

    for (const found of bosses) {
      await withLock(String(found.chatId),async()=>{
        const boss=await Boss.findById(found._id);
        if(!boss||boss.currentHp<=0||boss.hp<=0||boss.aliveTime<=now)return;
        tickSoulDots(boss,now);
        if(boss.currentHp<=0){
            await bossSendLoot(boss,boss.chatId);
            boss.skill=null;boss.currentHp=0;boss.hp=0;boss.listOfDamage=[];boss.minions=[];boss.soulDots=[];
            await boss.save();return;
        }
        const fighterIds = new Set((boss.listOfDamage || []).map(row => String(row.id)));
        boss.nextAttackAt = now + nextAttackDelay()/(1-bossDebuffAmount(boss,'slow',now));
        if (!fighterIds.size) {
            await boss.save();
            return;
        }

        const chat = await Chat.findOne({ chatId: boss.chatId });
        if (!chat) {
            await boss.save();
            return;
        }

        const fighters = chat.members.filter(member => fighterIds.has(String(member.userId)));

        const records = [];
        if (isBossStunned(boss, now)) {
            // Nothing to cast until the stun wears off.
            boss.nextAttackAt = Math.max(boss.nextAttackAt, Number(boss.stunUntil));
        } else {
            const record = bossCastAttack(fighters, boss, { now });
            if (record) records.push(record);
        }
        records.push(...minionCasts(fighters, boss, { now }));
        await boss.save();
        if (!records.length) return;

        // Write only the hit fighters' HP / shield / respawn, so a concurrent
        // purchase or skill in the Mini App isn't overwritten by a stale chat.
        const hitIds = new Set(records.flatMap(record => record.hits.map(hit => hit.userId)));
        const killedIds = new Set(records.flatMap(record => record.hits.filter(hit => hit.killed).map(hit => hit.userId)));
        for (const userId of hitIds) {
            const member = fighters.find(item => String(item.userId) === userId);
            if (!member) continue;
            const set = {
                'members.$[m].game.gameClass.stats.hp': member.game.gameClass.stats.hp,
                'members.$[m].game.effects': member.game.effects || [],
            };
            if (killedIds.has(userId)) set['members.$[m].game.respawnTime'] = member.game.respawnTime;
            await Chat.updateOne({ chatId: boss.chatId }, { $set: set }, { arrayFilters: [{ 'm.userId': member.userId }] });
        }

        // The chat only hears about defeats; every hit is shown live in the Mini App.
        if (killedIds.size && chat.bossSettings?.showDamageMessage !== 0) {
            const kills = records
                .map(record => ({ ...record, hits: record.hits.filter(hit => hit.killed) }))
                .filter(record => record.hits.length);
            for (const record of kills) {
                await sendMessageWithDelete(boss.chatId, bossAttackMessage(boss, record), { disable_notification: true }, 10 * 1000)
                    .catch(error => console.error('[boss] attack message', error));
            }
        }
      });
    }
}
