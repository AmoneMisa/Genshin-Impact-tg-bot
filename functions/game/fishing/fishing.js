// Fishing without a minigame: the character casts with a fishing rod and the catch is settled by the clock, so
// it can run on its own (auto fishing) while the player is away.
//   - the real rods of High Five (template/fishingData.js): one per grade (no grade, D, C, B, A, S); a rod asks for
//     a level and its damage is its speed;
//   - a fishing shot of the rod's grade (burnt by each cast, like a soulshot) doubles the damage to the fish: a cast
//     takes half the time;
//   - a daily number of fish by the grade of the rod; past it a cast catches something only by a very low chance;
//   - the real fish: a fish of the character's level is caught, opening it (as double-clicking a fish in L2)
//     turns it into Fish Oil, scales, bones, gems ... by the real chances; those are the dye ingredients;
//   - the Fishing skill and Fishing Expertise 1-27 (real character levels, 1 4 7 ... 79) decide which fish are met;
//     they are learned at the Fishermen's Guild for Proof of Catching a Fish tickets, which the Guild gives for
//     fish oil, scales, bones and gems at the real rates;
//   - nothing runs in the background: the casts that fell due are settled whenever the screen or an action asks.
import DATA from '../../../template/fishingData.js';
import {addMaterial, getMaterialCount, materialInfo, spendMaterials} from '../player/materials.js';

export const ROD_GRADES = Object.freeze(['noGrade', 'D', 'C', 'B', 'A', 'S']);

export const FISHING = Object.freeze({
    // time of one cast with the slowest rod; a rod of damage D casts in castMs * 20 / D, a fishing shot halves it
    castMs: 30 * 1000,
    // fish a day by the grade of the rod
    dailyFish: Object.freeze({noGrade: 50, D: 80, C: 110, B: 160, A: 220, S: 500}),
    // after the daily number of fish a cast still catches by this chance
    overLimitChance: 0.005,
    // casts settled in one go and the longest absence that counts
    maxBatch: 2000,
    maxAwayMs: 12 * 3600 * 1000,
    // a ticket stands for this much of the real adena price of a skill level
    adenaPerTicket: 100,
});

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
export const rodKey = item => `l2_${item}`;
export const fishKey = item => `l2_${item}`;
export const shotKey = grade => `l2_${DATA.shots[grade]}`;
export const ticketKey = `l2_${DATA.proofItem}`;
export const MAX_EXPERTISE = DATA.expertise.length;
export const ticketsFor = adena => Math.max(1, Math.round(adena / FISHING.adenaPerTicket));
const byItem = new Map(DATA.fish.map(fish => [fish.item, fish]));
/** Only the fish a capsule is known for can be caught. */
const catchable = DATA.fish.filter(fish => DATA.capsules[fish.item]);
const GRADE_WEIGHT = {easy: 3, normal: 6, hard: 1};
const RODS = DATA.rods.map((rod, index) => ({...rod, grade: ROD_GRADES[index]}));

export const dayKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

function ensureState(session, now) {
    const game = session.game;
    if (!game.fishing || typeof game.fishing !== 'object') game.fishing = {day: dayKey(now), fish: 0, casts: 0, auto: false, shots: true, lastAt: 0, total: 0, learned: false, expertise: 0};
    const state = game.fishing;
    if (state.day !== dayKey(now)) { state.day = dayKey(now); state.fish = 0; state.casts = 0; }
    if (typeof state.shots !== 'boolean') state.shots = true;
    if (!Number.isFinite(state.fish)) state.fish = number(state.casts);
    return state;
}

/** The best rod the character owns and may use: {item, name, level, damage, grade} or null. */
export function bestRod(session) {
    const level = number(session?.game?.stats?.lvl, 1);
    return RODS
        .filter(rod => rod.level <= level && getMaterialCount(session, rodKey(rod.item)) > 0)
        .sort((a, b) => b.damage - a.damage)[0] || null;
}

/** Cast time of a rod; with a fishing shot the damage is doubled and the fish is landed twice as fast. */
export const castMs = (rod, shot = false) => Math.max(3000, Math.round(FISHING.castMs * 20 / (rod?.damage || 20) / (shot ? 2 : 1)));
export const dailyLimit = rod => FISHING.dailyFish[rod?.grade] || 0;

/** The highest fish level a character meets: its Fishing Expertise (0 before the skill is learned). */
export const fishLevelFor = session => (session?.game?.fishing?.learned ? Math.max(0, Math.min(MAX_EXPERTISE, number(session.game.fishing.expertise))) : 0);

/** One fish of the given top fish level: the top three fish levels are fished, by bite rate and grade. */
export function pickFish(top, random = Math.random) {
    top = Math.max(1, top);
    const pool = catchable.filter(fish => fish.level <= top && fish.level >= Math.max(1, top - 2));
    const weights = pool.map(fish => fish.bite * (GRADE_WEIGHT[fish.grade] || 1));
    let roll = random() * weights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < pool.length; index += 1) {
        roll -= weights[index];
        if (roll < 0) return pool[index];
    }
    return pool.at(-1);
}

/**
 * `count` casts: each burns a shot (when shots are on and owned, and the daily fish are not yet caught) and catches
 * a fish; past the daily number a cast catches by overLimitChance only.
 * Returns {caught: [{item, name, amount}], shotsSpent, fish, casts}.
 */
function cast(session, state, rod, count, random) {
    const caught = new Map();
    const level = Math.max(1, fishLevelFor(session));
    const limit = dailyLimit(rod);
    let shotsSpent = 0, fish = 0;
    for (let index = 0; index < count; index += 1) {
        const over = state.fish >= limit;
        if (!over && state.shots && getMaterialCount(session, shotKey(rod.grade)) > 0) {
            spendMaterials(session, {[shotKey(rod.grade)]: 1});
            shotsSpent += 1;
        }
        state.casts += 1;
        if (over && random() >= FISHING.overLimitChance) continue;
        const found = pickFish(level, random);
        caught.set(found.item, (caught.get(found.item) || 0) + 1);
        addMaterial(session, fishKey(found.item), 1);
        state.fish += 1;
        fish += 1;
    }
    state.total = number(state.total) + count;
    return {caught: [...caught].map(([item, amount]) => ({item, name: byItem.get(item).name, amount})), shotsSpent, fish, casts: count};
}

/** Does the next cast burn a shot (so that it is the quick one)? */
const shotReady = (session, state, rod) => state.shots && state.fish < dailyLimit(rod) && getMaterialCount(session, shotKey(rod.grade)) > 0;

/**
 * Settles the casts that fell due while auto fishing was on. Returns the catch: [{item, name, amount}].
 * Casts are made one by one, so a stock of shots ending in the middle slows the rest down.
 */
export function settleFishing(session, now = Date.now(), random = Math.random) {
    const state = ensureState(session, now);
    if (!state.auto) return [];
    const rod = bestRod(session);
    if (!rod || fishLevelFor(session) < 1) { state.auto = false; return []; }
    if (!state.lastAt || state.lastAt > now) state.lastAt = now;
    state.lastAt = Math.max(state.lastAt, now - FISHING.maxAwayMs);
    const totals = new Map();
    let made = 0;
    while (made < FISHING.maxBatch) {
        const step = castMs(rod, shotReady(session, state, rod));
        if (now - state.lastAt < step) break;
        const result = cast(session, state, rod, 1, random);
        for (const row of result.caught) totals.set(row.item, (totals.get(row.item) || 0) + row.amount);
        state.lastAt += step;
        made += 1;
    }
    return [...totals].map(([item, amount]) => ({item, name: byItem.get(item).name, amount}));
}

/** One manual cast: ready again after the rod's cast time. */
export function castOnce(session, now = Date.now(), random = Math.random) {
    const settled = settleFishing(session, now, random);
    const state = ensureState(session, now);
    const rod = bestRod(session);
    if (!rod) return {ok: false, reason: 'no_rod'};
    if (fishLevelFor(session) < 1) return {ok: false, reason: 'not_learned'};
    const wait = number(state.lastAt) + castMs(rod, shotReady(session, state, rod)) - now;
    if (!state.auto && state.lastAt && wait > 0) return {ok: false, reason: 'not_ready', waitMs: wait};
    const over = state.fish >= dailyLimit(rod);
    const result = cast(session, state, rod, 1, random);
    state.lastAt = now;
    return {ok: true, caught: [...settled, ...result.caught], rod: rod.name, over, shotsSpent: result.shotsSpent};
}

export function setAuto(session, enabled, now = Date.now(), random = Math.random) {
    const settled = settleFishing(session, now, random);
    const state = ensureState(session, now);
    if (enabled) {
        if (!bestRod(session)) return {ok: false, reason: 'no_rod', caught: settled};
        if (fishLevelFor(session) < 1) return {ok: false, reason: 'not_learned', caught: settled};
        state.auto = true;
        state.lastAt = now;
    } else {
        state.auto = false;
    }
    return {ok: true, auto: state.auto, caught: settled};
}

/** Fishing shots on or off (they are burnt by casts while on). */
export function setShots(session, enabled, now = Date.now()) {
    const state = ensureState(session, now);
    state.shots = Boolean(enabled);
    return {ok: true, shots: state.shots, caught: []};
}

/** The fish in the bag with what they can turn into. */
export function fishInBag(session) {
    return catchable
        .map(fish => ({...fish, count: getMaterialCount(session, fishKey(fish.item))}))
        .filter(fish => fish.count > 0)
        .map(fish => ({item: fish.item, name: fish.name, level: fish.level, grade: fish.grade, count: fish.count,
            can: DATA.capsules[fish.item].map(([item, amount, chance]) => ({item, name: DATA.items[item]?.[0] || String(item), amount, chance}))}));
}

/**
 * Opens fish like double-clicking them in Lineage II: each fish is used up and gives one of its products by chance
 * (the chances do not add up to 100%, so some fish give nothing). `item` is a fish id or 'all'.
 */
export function openFish(session, item = 'all', count = 'all', random = Math.random) {
    const targets = (item === 'all' ? catchable.map(fish => fish.item) : [Number(item)]).filter(id => DATA.capsules[id]);
    if (!targets.length) return {ok: false, reason: 'not_a_fish'};
    const got = new Map();
    let opened = 0, empty = 0;
    for (const id of targets) {
        const owned = getMaterialCount(session, fishKey(id));
        const amount = count === 'all' ? owned : Math.min(owned, Math.max(0, Math.floor(number(count))));
        if (!amount) continue;
        spendMaterials(session, {[fishKey(id)]: amount});
        for (let index = 0; index < amount; index += 1) {
            opened += 1;
            let roll = random() * 100, product = null;
            for (const candidate of DATA.capsules[id]) {
                roll -= candidate[2];
                if (roll < 0) { product = candidate; break; }
            }
            if (!product) { empty += 1; continue; }
            addMaterial(session, `l2_${product[0]}`, product[1]);
            got.set(product[0], (got.get(product[0]) || 0) + product[1]);
        }
    }
    if (!opened) return {ok: false, reason: 'no_fish'};
    return {
        ok: true, opened, empty,
        items: [...got].map(([id, amount]) => ({item: id, key: `l2_${id}`, name: DATA.items[id]?.[0] || String(id), amount, icon: materialInfo(`l2_${id}`).icon})),
    };
}

/** What the Guild asks for the next skill level: {kind, level, needLevel, tickets} or null at the top. */
export function nextSkill(session, now = Date.now()) {
    const state = ensureState(session, now);
    if (!state.learned) return {kind: 'fishing', level: 1, needLevel: DATA.fishing.needLevel || 1, tickets: ticketsFor(DATA.fishing.adena)};
    const row = DATA.expertise[state.expertise];
    return row ? {kind: 'expertise', level: row.level, needLevel: row.needLevel, tickets: ticketsFor(row.adena)} : null;
}

/** Learns the Fishing skill, then Fishing Expertise level by level, for Proof of Catching a Fish tickets. */
export function learnSkill(session, now = Date.now()) {
    const state = ensureState(session, now);
    const next = nextSkill(session, now);
    if (!next) return {ok: false, reason: 'max_level'};
    if (number(session.game.stats?.lvl, 1) < next.needLevel) return {ok: false, reason: 'level_too_low', needLevel: next.needLevel};
    if (getMaterialCount(session, ticketKey) < next.tickets) return {ok: false, reason: 'not_enough_tickets', need: next.tickets};
    spendMaterials(session, {[ticketKey]: next.tickets});
    if (next.kind === 'fishing') state.learned = true; else state.expertise = next.level;
    return {ok: true, learned: next.kind, level: state.expertise, spent: next.tickets};
}

/** The Guild turns oils, scales, bones and gems into Proofs of Catching a Fish at the real rates. */
export function exchangeProofs(session, item = 'all', count = 'all') {
    const targets = (item === 'all' ? Object.keys(DATA.proofs).map(Number) : [Number(item)]).filter(id => DATA.proofs[id]);
    if (!targets.length) return {ok: false, reason: 'not_exchangeable'};
    let tickets = 0, given = 0;
    for (const id of targets) {
        const owned = getMaterialCount(session, `l2_${id}`);
        const amount = count === 'all' ? owned : Math.min(owned, Math.max(0, Math.floor(number(count))));
        if (!amount) continue;
        spendMaterials(session, {[`l2_${id}`]: amount});
        tickets += amount * DATA.proofs[id];
        given += amount;
    }
    if (!given) return {ok: false, reason: 'nothing_to_exchange'};
    addMaterial(session, ticketKey, tickets);
    return {ok: true, tickets, given};
}

export function getFishingState(session, now = Date.now()) {
    const state = ensureState(session, now);
    const rod = bestRod(session);
    const shot = rod ? shotReady(session, state, rod) : false;
    const step = castMs(rod, shot);
    const limit = dailyLimit(rod);
    return {
        auto: Boolean(state.auto) && Boolean(rod),
        shots: state.shots,
        shot: rod ? {grade: rod.grade, key: shotKey(rod.grade), item: DATA.shots[rod.grade], name: DATA.items[DATA.shots[rod.grade]]?.[0] || '', count: getMaterialCount(session, shotKey(rod.grade)), active: shot} : null,
        rod: rod ? {item: rod.item, name: rod.name, level: rod.level, damage: rod.damage, grade: rod.grade, castMs: step} : null,
        rods: RODS.map(entry => ({item: entry.item, name: entry.name, level: entry.level, damage: entry.damage, grade: entry.grade, limit: FISHING.dailyFish[entry.grade], owned: getMaterialCount(session, rodKey(entry.item)) > 0, usable: entry.level <= number(session.game.stats?.lvl, 1)})),
        fishToday: state.fish, limit, remaining: Math.max(0, limit - state.fish), overLimit: Boolean(rod) && state.fish >= limit,
        overChance: FISHING.overLimitChance,
        casts: state.casts,
        nextCastMs: rod && state.lastAt ? Math.max(0, state.lastAt + step - now) : 0,
        fishLevel: fishLevelFor(session),
        skill: {learned: Boolean(state.learned), expertise: fishLevelFor(session), max: MAX_EXPERTISE, next: nextSkill(session, now)},
        tickets: getMaterialCount(session, ticketKey),
        exchange: Object.entries(DATA.proofs).map(([id, rate]) => ({item: Number(id), name: DATA.items[id]?.[0] || id, rate, count: getMaterialCount(session, `l2_${id}`)})).filter(row => row.count > 0),
        total: number(state.total),
        fishBag: fishInBag(session),
    };
}
