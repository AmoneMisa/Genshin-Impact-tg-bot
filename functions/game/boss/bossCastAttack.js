import calcBossDamage from './calcBossDamage.js';
import getMaxHp from '../player/getters/getMaxHp.js';
import { getBossAttacks } from '../../../template/bossAttacksTemplate.js';

export const RESPAWN_MS = 60 * 1000;
// The boss acts every few seconds while alive, so each cast deals a fraction
// of a full hit (the old attack hit everyone once per two minutes).
export const ATTACK_MIN_MS = 5 * 1000;
export const ATTACK_MAX_MS = 8 * 1000;
export const LIVE_DAMAGE_SCALE = 0.12;
const ATTACK_LOG_SIZE = 5;
// Single-target attacks go for the top damage dealer this often, otherwise a
// random fighter.
const AGGRO_CHANCE = 0.6;

function memberName(member) {
    const user = member?.userChatData?.user;
    return user?.username || user?.first_name || `Игрок ${member?.userId}`;
}

function pickWeighted(list, random) {
    const total = list.reduce((sum, item) => sum + (Number(item.weight) || 1), 0);
    let roll = random() * total;
    for (const item of list) {
        roll -= Number(item.weight) || 1;
        if (roll < 0) return item;
    }
    return list[list.length - 1];
}

function pickTargets(attack, fighters, boss, random) {
    if (attack.target === 'all') return fighters;
    const byDamage = new Map((boss.listOfDamage || []).map(row => [String(row.id), Number(row.damage) || 0]));
    const top = fighters
        .filter(member => byDamage.get(String(member.userId)) > 0)
        .sort((a, b) => byDamage.get(String(b.userId)) - byDamage.get(String(a.userId)))[0];
    if (top && random() < AGGRO_CHANCE) return [top];
    return [fighters[Math.floor(random() * fighters.length)]];
}

/** Shield first, then HP; a fighter brought to 0 HP starts the respawn timer. */
function applyHit(member, dmg, now) {
    const player = member.game;
    // Clamp a possibly-corrupted stored hp before the damage math.
    player.gameClass.stats.hp = Math.min(player.gameClass.stats.hp, getMaxHp(member, player.gameClass));
    const shield = (player.effects || []).find(effect => effect.name === 'shield' && effect.value > 0);
    const absorbed = shield ? Math.min(shield.value, dmg) : 0;
    if (shield) shield.value -= absorbed;
    const lost = Math.min(player.gameClass.stats.hp, dmg - absorbed);
    player.gameClass.stats.hp = Math.max(0, player.gameClass.stats.hp - lost);
    const killed = player.gameClass.stats.hp === 0;
    if (killed) player.respawnTime = now + RESPAWN_MS;
    return { absorbed, lost, killed };
}

/**
 * The boss casts one of its own attacks on the living fighters of the chat.
 * Records it on the boss (`lastAttack`, `attackLog`) and returns it, or null
 * when nobody is left to hit.
 */
export default function bossCastAttack(members, boss, { now = Date.now(), random = Math.random, damage = calcBossDamage, scale = LIVE_DAMAGE_SCALE } = {}) {
    if (!boss) throw new Error('Босс не найден!');

    const fighters = Object.values(members || {}).filter(member =>
        !member?.userChatData?.user?.is_bot && !member?.isHided && Number(member?.game?.gameClass?.stats?.hp) > 0);
    if (!fighters.length) return null;

    const attack = pickWeighted(getBossAttacks(boss.name), random);
    const hits = pickTargets(attack, fighters, boss, random).map(member => {
        const base = Math.ceil(damage(boss, member));
        const dmg = Math.max(1, Math.ceil(base * attack.power * scale));
        const { absorbed, lost, killed } = applyHit(member, dmg, now);
        return {
            userId: String(member.userId),
            name: memberName(member),
            dmg,
            absorbed,
            lost,
            hp: member.game.gameClass.stats.hp,
            killed,
        };
    });

    const record = { key: attack.key, name: attack.name, icon: attack.icon, target: attack.target, at: now, hits };
    boss.lastAttack = record;
    boss.attackLog = [record, ...(Array.isArray(boss.attackLog) ? boss.attackLog : [])].slice(0, ATTACK_LOG_SIZE);
    boss.markModified?.('lastAttack');
    boss.markModified?.('attackLog');
    return record;
}

/** Pause before the boss's next cast. */
export function nextAttackDelay(random = Math.random) {
    return Math.round(ATTACK_MIN_MS + random() * (ATTACK_MAX_MS - ATTACK_MIN_MS));
}

export function bossAttackMessage(boss, record) {
    const lines = [`${record.icon} ${boss.nameCall || boss.name} использует «${record.name}»!`, ''];
    for (const hit of record.hits) {
        const shield = hit.absorbed > 0 ? ` (щит поглотил ${hit.absorbed})` : '';
        lines.push(`${hit.name} — ${hit.dmg} урона${shield}${hit.killed ? ' · повержен(-а)' : ''}`);
    }
    return lines.join('\n');
}
