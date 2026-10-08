import calcBossHit from './bossHit.js';
import getMaxHp from '../player/getters/getMaxHp.js';
import { getBossAttacks, getMinionAttacks } from '../../../template/bossAttacksTemplate.js';
import { evadeChance, guardReduction, isTaunting } from '../player/skillEffects.js';
import { aliveUnits, bossTemplateFor } from './bossUnits.js';

export const RESPAWN_MS = 60 * 1000;
// The boss acts every few seconds while alive; the hit itself is sized by
// bossHit.js, so no extra scaling is applied here.
export const ATTACK_MIN_MS = 5 * 1000;
export const ATTACK_MAX_MS = 8 * 1000;
export const LIVE_DAMAGE_SCALE = 1;
const ATTACK_LOG_SIZE = 5;
// An ultimate is announced this long before it lands (always before the next cast).
const CHARGE_MS = 4 * 1000;
const DEFAULT_ULTIMATE_EVERY = 6;
const MINION_ATTACK_MIN_MS = 7 * 1000;
const MINION_ATTACK_MAX_MS = 11 * 1000;
// Single-target attacks go for the top damage dealer this often, otherwise a
// random fighter. A taunting fighter overrides both.
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

function shuffled(list, random) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function pickTargets(attack, fighters, boss, random, now) {
    if (attack.target === 'all') return fighters;

    const taunting = fighters.filter(member => isTaunting(member, now));
    if (attack.target === 'multi') {
        const rest = shuffled(fighters.filter(member => !taunting.includes(member)), random);
        return [...taunting, ...rest].slice(0, Math.max(1, attack.count || 2));
    }
    if (taunting.length) return [taunting[Math.floor(random() * taunting.length)]];

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

/** One attack landing on its targets. Returns the per-fighter hit rows. */
function strike(attack, targets, boss, { now, random, damage, scale, unitPower = 1 }) {
    return targets.map(member => {
        const evade = evadeChance(member, now);
        if (evade > 0 && random() < evade) {
            return { userId: String(member.userId), name: memberName(member), dmg: 0, absorbed: 0, lost: 0, hp: member.game.gameClass.stats.hp, killed: false, evaded: true };
        }
        const guard = guardReduction(member, now);
        const base = Math.ceil(damage(boss, member, { now, random, unitPower }));
        const dmg = Math.max(1, Math.ceil(base * attack.power * scale * (1 - guard)));
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
}

function livingFighters(members) {
    return Object.values(members || {}).filter(member =>
        !member?.userChatData?.user?.is_bot && !member?.isHided && Number(member?.game?.gameClass?.stats?.hp) > 0);
}

function pushRecord(boss, record) {
    boss.lastAttack = record;
    boss.attackLog = [record, ...(Array.isArray(boss.attackLog) ? boss.attackLog : [])].slice(0, ATTACK_LOG_SIZE);
    boss.markModified?.('lastAttack');
    boss.markModified?.('attackLog');
}

/**
 * The boss casts one of its own attacks on the living fighters of the chat.
 * Records it on the boss (`lastAttack`, `attackLog`) and returns it, or null
 * when nobody is left to hit.
 *
 * Every `combat.ultimateEvery` casts the boss instead *charges* its ultimate:
 * a hit-less warning record. The next cast fires it, unless a stun (see
 * bossDebuffs.js) interrupted the charge in between.
 */
export default function bossCastAttack(members, boss, { now = Date.now(), random = Math.random, damage = calcBossHit, scale = LIVE_DAMAGE_SCALE } = {}) {
    if (!boss) throw new Error('Босс не найден!');

    const fighters = livingFighters(members);
    if (!fighters.length) return null;

    const attacks = getBossAttacks(boss.name);
    const phase = Number(boss.phaseIndex) || 0;
    const ultimate = attacks.find(attack => attack.ultimate && (attack.unlock || 0) <= phase);
    const every = Number(bossTemplateFor(boss)?.combat?.ultimateEvery) || DEFAULT_ULTIMATE_EVERY;

    if (boss.charging && ultimate && boss.charging.key === ultimate.key && now >= boss.charging.readyAt) {
        boss.charging = null;
        boss.castCount = 0;
        boss.markModified?.('charging');
        return fire(ultimate, fighters, boss, { now, random, damage, scale });
    }

    if (ultimate && !boss.charging && (Number(boss.castCount) || 0) >= every) {
        boss.charging = { key: ultimate.key, readyAt: now + CHARGE_MS };
        boss.markModified?.('charging');
        const record = {
            key: 'charge', name: `Накапливает «${ultimate.name}»`, icon: '⚠️', target: ultimate.target,
            at: now, charging: true, ultimate: ultimate.key, hits: [],
        };
        pushRecord(boss, record);
        return record;
    }

    const ordinary = attacks.filter(attack => !attack.ultimate && (attack.unlock || 0) <= phase);
    const attack = pickWeighted(ordinary, random);
    boss.castCount = (Number(boss.castCount) || 0) + 1;
    return fire(attack, fighters, boss, { now, random, damage, scale });
}

function fire(attack, fighters, boss, options) {
    const { now, random } = options;
    const hits = strike(attack, pickTargets(attack, fighters, boss, random, now), boss, options);
    const record = { key: attack.key, name: attack.name, icon: attack.icon, target: attack.target, at: now, hits };
    if (attack.ultimate) record.ultimate = true;
    pushRecord(boss, record);
    return record;
}

/**
 * The boss's minions act: partners and heads each cast their own attack, the
 * rest strike together as one "swarm" record. Only units whose own timer is up
 * act. Returns the new records (possibly none).
 */
export function minionCasts(members, boss, { now = Date.now(), random = Math.random, damage = calcBossHit, scale = LIVE_DAMAGE_SCALE } = {}) {
    const fighters = livingFighters(members);
    if (!fighters.length) return [];

    // Attack timers live in `minionClock`, apart from the units' hp, so this
    // scheduler never rewrites hp a player has just changed.
    const clock = boss.minionClock && typeof boss.minionClock === 'object' ? boss.minionClock : {};
    const due = aliveUnits(boss).filter(unit => !(Number(clock[unit.id] ?? unit.nextAttackAt) > now));
    if (!due.length) return [];

    const records = [];
    const swarmHits = [];
    for (const unit of due) {
        clock[unit.id] = now + MINION_ATTACK_MIN_MS + Math.round(random() * (MINION_ATTACK_MAX_MS - MINION_ATTACK_MIN_MS));
        const attack = pickWeighted(getMinionAttacks(unit.attackKey || unit.key), random);
        const alive = fighters.filter(member => Number(member.game.gameClass.stats.hp) > 0);
        if (!alive.length) break;
        const hits = strike(attack, pickTargets(attack, alive, boss, random, now), boss, { now, random, damage, scale, unitPower: unit.power });
        if (unit.kind === 'minion') {
            swarmHits.push(...hits);
        } else {
            records.push({ key: `unit_${unit.key}`, name: `${unit.name}: ${attack.name}`, icon: attack.icon, target: attack.target, at: now, hits, unit: unit.key });
        }
    }

    if (swarmHits.length) {
        const merged = new Map();
        for (const hit of swarmHits) {
            const existing = merged.get(hit.userId);
            if (!existing) merged.set(hit.userId, { ...hit });
            else {
                existing.dmg += hit.dmg;
                existing.absorbed += hit.absorbed;
                existing.lost += hit.lost;
                existing.hp = hit.hp;
                existing.killed = existing.killed || hit.killed;
                existing.evaded = existing.evaded && hit.evaded;
            }
        }
        records.push({ key: 'swarm', name: 'Свита атакует', icon: '👥', target: 'multi', at: now, hits: [...merged.values()] });
    }

    boss.minionClock = clock;
    boss.markModified?.('minionClock');
    for (const record of records) pushRecord(boss, record);
    return records;
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
