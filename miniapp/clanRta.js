// Clan RTA: ranked team battles between clans. Up to five members of a clan put a frozen copy of
// their fighter into the squad; a manager challenges another clan and the squads fight duel by duel
// (the friendly-duel engine, fighters paired from the strongest). The team with more duels won takes
// rating from the other (Elo) and a prize for the warehouse. Fighters are copies, so a battle never
// touches a player's own game and works while they are offline, from any chat.
import Clan from '../db/models/Clan.js';
import RtaFighter from '../db/models/RtaFighter.js';
import getClan from '../functions/game/clans/getClan.js';
import getUserName from '../functions/getters/getUserName.js';
import clanDuel from '../functions/game/clans/clanDuel.js';
import calcGearScore from '../functions/game/player/calcGearScore.js';
import addClanXp from '../functions/game/clans/addClanXp.js';

export const RTA_SQUAD_SIZE = 5;
export const RTA_MIN_SQUAD = 3;
export const RTA_START_RATING = 1000;
export const RTA_K = 32;
export const RTA_COOLDOWN_MS = 60 * 60 * 1000;
export const RTA_MAX_RATING_GAP = 300;
export const RTA_WIN_GOLD = 5000;
export const RTA_WIN_XP = 150;
const HISTORY_LIMIT = 10;

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const idOf = clan => String(clan?._id);

function findMember(clan, userId) {
    return clan?.members?.find(member => String(member.userId) === String(userId)) || null;
}

const isManager = (clan, userId) => String(clan?.owner) === String(userId) || findMember(clan, userId)?.role === 'officer';

export function ensureRta(clan) {
    if (!clan.rta || typeof clan.rta !== 'object') clan.rta = {};
    const rta = clan.rta;
    rta.rating = number(rta.rating, RTA_START_RATING);
    rta.wins = number(rta.wins);
    rta.losses = number(rta.losses);
    rta.draws = number(rta.draws);
    if (!Array.isArray(rta.squad)) rta.squad = [];
    if (!Array.isArray(rta.history)) rta.history = [];
    rta.cooldownUntil = number(rta.cooldownUntil);
    return rta;
}

/** The combat parts of a game: everything a duel reads, without the inventory. */
export function snapshotFighter(session) {
    const plain = typeof session?.toObject === 'function' ? session.toObject() : session;
    const game = JSON.parse(JSON.stringify(plain?.game || {}));
    delete game.inventory;
    return {game};
}

export const hasCombatClass = session => Array.isArray(session?.game?.gameClass?.skills) && session.game.gameClass.skills.length > 0;

function powerOf(session) {
    try {
        return number(calcGearScore(session.game));
    } catch {
        return number(session?.game?.stats?.lvl) * 100;
    }
}

/** Elo with a draw worth half; `score` is 1 for a win of the first clan, 0.5 draw, 0 loss. */
export function eloChange(ratingA, ratingB, score, k = RTA_K) {
    const expected = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
    return Math.round(k * (score - expected));
}

/**
 * Fights two squads. Fighters are sorted by power and paired 1:1 up to the shorter squad.
 * `duel(attacker, defender)` returns {result: 0 attacker wins | 1 defender wins | 2 draw}.
 */
export function fightSquads(attackers, defenders, duel = clanDuel) {
    const sort = list => [...list].sort((a, b) => b.power - a.power);
    const a = sort(attackers);
    const d = sort(defenders);
    const rounds = [];
    let wins = 0;
    let losses = 0;
    for (let i = 0; i < Math.min(a.length, d.length); i++) {
        const outcome = duel(structuredClone(a[i].snapshot), structuredClone(d[i].snapshot));
        const side = outcome.result === 0 ? 'attacker' : outcome.result === 1 ? 'defender' : 'draw';
        if (side === 'attacker') wins++;
        if (side === 'defender') losses++;
        rounds.push({attacker: a[i].name, defender: d[i].name, winner: side});
    }
    return {rounds, wins, losses, result: wins > losses ? 'win' : wins < losses ? 'loss' : 'draw'};
}

const flip = result => (result === 'win' ? 'loss' : result === 'loss' ? 'win' : 'draw');

/** Applies a finished battle to both clans; returns the rating changes. Callers save the clans. */
export function applyRtaResult(attackerClan, defenderClan, fight, now = Date.now()) {
    const a = ensureRta(attackerClan);
    const d = ensureRta(defenderClan);
    const score = fight.result === 'win' ? 1 : fight.result === 'loss' ? 0 : 0.5;
    const change = eloChange(a.rating, d.rating, score);
    a.rating = Math.max(0, a.rating + change);
    d.rating = Math.max(0, d.rating - change);
    if (fight.result === 'win') { a.wins++; d.losses++; }
    else if (fight.result === 'loss') { a.losses++; d.wins++; }
    else { a.draws++; d.draws++; }
    a.cooldownUntil = now + RTA_COOLDOWN_MS;

    const winner = fight.result === 'win' ? attackerClan : fight.result === 'loss' ? defenderClan : null;
    if (winner) {
        if (!winner.warehouse) winner.warehouse = {};
        winner.warehouse.gold = number(winner.warehouse.gold) + RTA_WIN_GOLD;
        addClanXp(winner, RTA_WIN_XP);
    }
    a.history = [{at: now, opponent: defenderClan.name, result: fight.result, wins: fight.wins, losses: fight.losses, change}, ...a.history].slice(0, HISTORY_LIMIT);
    d.history = [{at: now, opponent: attackerClan.name, result: flip(fight.result), wins: fight.losses, losses: fight.wins, change: -change}, ...d.history].slice(0, HISTORY_LIMIT);
    return {change, rating: a.rating, opponentRating: d.rating};
}

async function fightersOf(clan) {
    const rta = ensureRta(clan);
    if (!rta.squad.length) return [];
    return RtaFighter.find({clanId: idOf(clan), userId: {$in: rta.squad.map(Number)}}).lean();
}

export async function getRtaState(clan, userId, now = Date.now()) {
    if (!clan) return null;
    const rta = ensureRta(clan);
    const fighters = await fightersOf(clan);
    const rivals = await Clan.find({_id: {$ne: clan._id}, 'rta.squad.2': {$exists: true}}).sort({'rta.rating': -1}).limit(60);
    const near = rivals
        .filter(rival => Math.abs(number(rival.rta?.rating, RTA_START_RATING) - rta.rating) <= RTA_MAX_RATING_GAP)
        .sort((x, y) => Math.abs(x.rta.rating - rta.rating) - Math.abs(y.rta.rating - rta.rating))
        .slice(0, 8);
    const top = await Clan.find({'rta.rating': {$exists: true}}).sort({'rta.rating': -1}).limit(10);
    return {
        rating: rta.rating, wins: rta.wins, losses: rta.losses, draws: rta.draws,
        squadSize: RTA_SQUAD_SIZE, minSquad: RTA_MIN_SQUAD, maxGap: RTA_MAX_RATING_GAP,
        inSquad: rta.squad.some(id => String(id) === String(userId)),
        canManage: isManager(clan, userId),
        cooldownMs: Math.max(0, rta.cooldownUntil - now),
        squad: fighters.map(f => ({userId: f.userId, name: f.name, power: Math.round(f.power)})).sort((x, y) => y.power - x.power),
        opponents: near.map(rival => ({id: idOf(rival), name: rival.name, rating: rival.rta.rating, squad: rival.rta.squad.length})),
        top: top.map(entry => ({id: idOf(entry), name: entry.name, rating: number(entry.rta?.rating, RTA_START_RATING), mine: idOf(entry) === idOf(clan)})),
        history: rta.history,
    };
}

/** Puts (or refreshes) the player's fighter in the clan squad. */
export async function joinRtaSquad(clan, userId, session, name) {
    if (!clan || !findMember(clan, userId)) return {ok: false, reason: 'not_in_clan'};
    if (!hasCombatClass(session)) return {ok: false, reason: 'no_combat_class'};
    const rta = ensureRta(clan);
    const inSquad = rta.squad.some(id => String(id) === String(userId));
    if (!inSquad && rta.squad.length >= RTA_SQUAD_SIZE) return {ok: false, reason: 'rta_squad_full'};
    await RtaFighter.updateOne(
        {userId: Number(userId)},
        {$set: {clanId: idOf(clan), name: name || `Игрок ${userId}`, power: powerOf(session), snapshot: snapshotFighter(session)}},
        {upsert: true},
    );
    if (!inSquad) rta.squad.push(Number(userId));
    return {ok: true, refreshed: inSquad, message: inSquad ? 'Боец обновлён.' : 'Ты в отряде клана.'};
}

export async function leaveRtaSquad(clan, userId, actorId) {
    if (!clan || !findMember(clan, userId)) return {ok: false, reason: 'not_in_clan'};
    if (String(userId) !== String(actorId) && !isManager(clan, actorId)) return {ok: false, reason: 'not_allowed'};
    const rta = ensureRta(clan);
    rta.squad = rta.squad.filter(id => String(id) !== String(userId));
    await RtaFighter.deleteOne({userId: Number(userId)});
    return {ok: true};
}

/** A manager sends the squad against another clan. Saves both clans on success. */
export async function startRtaBattle(clan, actorId, opponentId, {now = Date.now(), duel = clanDuel} = {}) {
    if (!clan || !findMember(clan, actorId)) return {ok: false, reason: 'not_in_clan'};
    if (!isManager(clan, actorId)) return {ok: false, reason: 'not_allowed'};
    const rta = ensureRta(clan);
    if (rta.cooldownUntil > now) return {ok: false, reason: 'rta_cooldown', cooldownMs: rta.cooldownUntil - now};
    if (!/^[a-f0-9]{24}$/i.test(String(opponentId || '')) || String(opponentId) === idOf(clan)) return {ok: false, reason: 'rta_unknown_opponent'};
    const opponent = await Clan.findById(opponentId);
    if (!opponent) return {ok: false, reason: 'rta_unknown_opponent'};
    const other = ensureRta(opponent);
    if (Math.abs(other.rating - rta.rating) > RTA_MAX_RATING_GAP) return {ok: false, reason: 'rta_rating_gap'};

    const mine = await fightersOf(clan);
    const theirs = await fightersOf(opponent);
    if (mine.length < RTA_MIN_SQUAD) return {ok: false, reason: 'rta_squad_small'};
    if (theirs.length < RTA_MIN_SQUAD) return {ok: false, reason: 'rta_opponent_squad_small'};

    const fight = fightSquads(mine, theirs, duel);
    const applied = applyRtaResult(clan, opponent, fight, now);
    await Promise.all([clan.save(), opponent.save()]);
    const sign = applied.change > 0 ? '+' : '';
    const verdict = fight.result === 'win' ? 'Победа' : fight.result === 'loss' ? 'Поражение' : 'Ничья';
    return {
        ok: true, result: fight.result, wins: fight.wins, losses: fight.losses, rounds: fight.rounds, opponent: opponent.name, ...applied,
        message: `${verdict} против ${opponent.name}: ${fight.wins}:${fight.losses}, рейтинг ${sign}${applied.change}.`,
    };
}

/** Squad actions of the Mini App. Returns {clan, result}; the caller saves `clan` when it is set. */
export async function performRtaAction(userId, session, action, body = {}) {
    const clan = await getClan(userId);
    if (!clan) return {clan: null, result: {ok: false, reason: 'not_in_clan'}};
    if (action === 'rta_battle') return {clan: null, result: await startRtaBattle(clan, userId, body.opponentId)};
    if (action === 'rta_join') return {clan, result: await joinRtaSquad(clan, userId, session, await getUserName(Number(userId), 'name'))};
    if (action === 'rta_leave') return {clan, result: await leaveRtaSquad(clan, body.userId ?? userId, userId)};
    return {clan: null, result: {ok: false, reason: 'unknown_rta_action'}};
}
