// Fishing without a minigame: the character casts with a fishing rod and the catch is settled by the clock, so
// it can run on its own (auto fishing) while the player is away. Everything is limited by a daily number of casts.
//   - the real rods of High Five (template/fishingData.js): a rod asks for a level, its damage is its speed;
//   - the real fish: a fish of the character's level is caught, opening it (as double-clicking a fish in L2)
//     turns it into Fish Oil, scales, bones, gems ... by the real chances; those are the dye ingredients;
//   - nothing runs in the background: the casts that fell due are settled whenever the screen or an action asks.
import DATA from '../../../template/fishingData.js';
import {addMaterial, getMaterialCount, materialInfo, spendMaterials} from '../player/materials.js';

export const FISHING = Object.freeze({
    // time of one cast with the slowest rod; a rod of damage D casts in castMs * 20 / D
    castMs: 30 * 1000,
    dailyCasts: 120,
    // casts settled in one go, so that a very long absence cannot run away with a request
    maxBatch: 200,
    // how fast the level of the character grows into fish levels (fish levels are 1-27)
    levelPerFishLevel: 3,
});

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
export const rodKey = item => `l2_${item}`;
export const fishKey = item => `l2_${item}`;
const byItem = new Map(DATA.fish.map(fish => [fish.item, fish]));
/** Only the fish a capsule is known for can be caught. */
const catchable = DATA.fish.filter(fish => DATA.capsules[fish.item]);
const GRADE_WEIGHT = {easy: 3, normal: 6, hard: 1};

export const dayKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

function ensureState(session, now) {
    const game = session.game;
    if (!game.fishing || typeof game.fishing !== 'object') game.fishing = {day: dayKey(now), casts: 0, auto: false, lastAt: 0, total: 0};
    const state = game.fishing;
    if (state.day !== dayKey(now)) { state.day = dayKey(now); state.casts = 0; }
    return state;
}

/** The best rod the character owns and may use: {item, name, level, damage} or null. */
export function bestRod(session) {
    const level = number(session?.game?.stats?.lvl, 1);
    return DATA.rods
        .filter(rod => rod.level <= level && getMaterialCount(session, rodKey(rod.item)) > 0)
        .sort((a, b) => b.damage - a.damage)[0] || null;
}

export const castMs = rod => Math.max(5000, Math.round(FISHING.castMs * 20 / (rod?.damage || 20)));

/** The highest fish level a character of that level meets. */
export const fishLevelFor = level => Math.max(1, Math.min(27, Math.round(number(level, 1) / FISHING.levelPerFishLevel)));

/** One fish for a character of that level: the top three fish levels are fished, by bite rate and grade. */
export function pickFish(level, random = Math.random) {
    const top = fishLevelFor(level);
    const pool = catchable.filter(fish => fish.level <= top && fish.level >= Math.max(1, top - 2));
    const weights = pool.map(fish => fish.bite * (GRADE_WEIGHT[fish.grade] || 1));
    let roll = random() * weights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < pool.length; index += 1) {
        roll -= weights[index];
        if (roll < 0) return pool[index];
    }
    return pool.at(-1);
}

/** Casts `count` times (the caller has checked the limit and the rod) and hands the fish over. */
function catchFish(session, count, level, random) {
    const caught = new Map();
    for (let index = 0; index < count; index += 1) {
        const fish = pickFish(level, random);
        caught.set(fish.item, (caught.get(fish.item) || 0) + 1);
        addMaterial(session, fishKey(fish.item), 1);
    }
    return [...caught].map(([item, amount]) => ({item, name: byItem.get(item).name, amount}));
}

/**
 * Settles the casts that fell due while auto fishing was on. Returns the catch: [{item, name, amount}].
 */
export function settleFishing(session, now = Date.now(), random = Math.random) {
    const state = ensureState(session, now);
    if (!state.auto) return [];
    const rod = bestRod(session);
    if (!rod) { state.auto = false; return []; }
    const remaining = Math.max(0, FISHING.dailyCasts - state.casts);
    const step = castMs(rod);
    if (!state.lastAt || state.lastAt > now) state.lastAt = now;
    const due = Math.floor((now - state.lastAt) / step);
    const casts = Math.min(due, remaining, FISHING.maxBatch);
    if (casts <= 0) {
        if (remaining <= 0) state.lastAt = now;
        return [];
    }
    state.casts += casts;
    state.total = number(state.total) + casts;
    state.lastAt = remaining <= casts ? now : state.lastAt + casts * step;
    return catchFish(session, casts, number(session.game.stats?.lvl, 1), random);
}

/** One manual cast: ready again after the rod's cast time, counted against the daily limit. */
export function castOnce(session, now = Date.now(), random = Math.random) {
    const settled = settleFishing(session, now, random);
    const state = ensureState(session, now);
    const rod = bestRod(session);
    if (!rod) return {ok: false, reason: 'no_rod'};
    if (state.casts >= FISHING.dailyCasts) return {ok: false, reason: 'daily_limit'};
    const wait = number(state.lastAt) + castMs(rod) - now;
    if (!state.auto && state.lastAt && wait > 0) return {ok: false, reason: 'not_ready', waitMs: wait};
    state.casts += 1;
    state.total = number(state.total) + 1;
    state.lastAt = now;
    const caught = catchFish(session, 1, number(session.game.stats?.lvl, 1), random);
    return {ok: true, caught: [...settled, ...caught], rod: rod.name};
}

export function setAuto(session, enabled, now = Date.now(), random = Math.random) {
    const settled = settleFishing(session, now, random);
    const state = ensureState(session, now);
    if (enabled) {
        if (!bestRod(session)) return {ok: false, reason: 'no_rod', caught: settled};
        if (state.casts >= FISHING.dailyCasts) return {ok: false, reason: 'daily_limit', caught: settled};
        state.auto = true;
        state.lastAt = now;
    } else {
        state.auto = false;
    }
    return {ok: true, auto: state.auto, caught: settled};
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

export function getFishingState(session, now = Date.now()) {
    const state = ensureState(session, now);
    const rod = bestRod(session);
    const step = castMs(rod);
    const remaining = Math.max(0, FISHING.dailyCasts - state.casts);
    return {
        auto: Boolean(state.auto) && Boolean(rod),
        rod: rod ? {item: rod.item, name: rod.name, level: rod.level, damage: rod.damage, castMs: step} : null,
        rods: DATA.rods.map(entry => ({item: entry.item, name: entry.name, level: entry.level, damage: entry.damage, owned: getMaterialCount(session, rodKey(entry.item)) > 0, usable: entry.level <= number(session.game.stats?.lvl, 1)})),
        casts: state.casts, limit: FISHING.dailyCasts, remaining,
        nextCastMs: rod && state.lastAt ? Math.max(0, state.lastAt + step - now) : 0,
        fishLevel: fishLevelFor(session.game.stats?.lvl),
        total: number(state.total),
        fish: fishInBag(session),
    };
}
