import Boss from '../../db/models/Boss.js';
import Chat from '../../db/models/Chat.js';
import bossCastAttack, { bossAttackMessage, nextAttackDelay } from '../game/boss/bossCastAttack.js';
import sendMessageWithDelete from '../tgBotFunctions/sendMessageWithDelete.js';

/**
 * Live boss combat: every alive boss casts one of its attacks every few
 * seconds on the fighters who joined the raid (anyone who hit it). Runs from
 * the per-second scheduler; bosses wait for their own `nextAttackAt`.
 */
export default async function bossLiveAttacks(now = Date.now()) {
    const bosses = await Boss.find({
        hp: { $gt: 0 },
        currentHp: { $gt: 0 },
        aliveTime: { $gt: now },
        $or: [{ nextAttackAt: { $exists: false } }, { nextAttackAt: null }, { nextAttackAt: { $lte: now } }],
    });

    for (const boss of bosses) {
        const fighterIds = new Set((boss.listOfDamage || []).map(row => String(row.id)));
        boss.nextAttackAt = now + nextAttackDelay();
        if (!fighterIds.size) {
            await boss.save();
            continue;
        }

        const chat = await Chat.findOne({ chatId: boss.chatId });
        if (!chat) {
            await boss.save();
            continue;
        }

        const fighters = chat.members.filter(member => fighterIds.has(String(member.userId)));
        const record = bossCastAttack(fighters, boss, { now });
        await boss.save();
        if (!record) continue;

        // Write only the hit fighters' HP / shield / respawn, so a concurrent
        // purchase or skill in the Mini App isn't overwritten by a stale chat.
        for (const hit of record.hits) {
            const member = fighters.find(item => String(item.userId) === hit.userId);
            if (!member) continue;
            const set = {
                'members.$[m].game.gameClass.stats.hp': member.game.gameClass.stats.hp,
                'members.$[m].game.effects': member.game.effects || [],
            };
            if (hit.killed) set['members.$[m].game.respawnTime'] = member.game.respawnTime;
            await Chat.updateOne({ chatId: boss.chatId }, { $set: set }, { arrayFilters: [{ 'm.userId': member.userId }] });
        }

        // The chat only hears about defeats; every hit is shown live in the Mini App.
        const kills = record.hits.filter(hit => hit.killed);
        if (kills.length && chat.bossSettings?.showDamageMessage !== 0) {
            await sendMessageWithDelete(boss.chatId, bossAttackMessage(boss, { ...record, hits: kills }), { disable_notification: true }, 10 * 1000)
                .catch(error => console.error('[boss] attack message', error));
        }
    }
}
