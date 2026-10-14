// Runes brewed in the Alchemy Lab (docs/economy-audit-2026-10-14.md). Eight kinds, three strengths, a few hours each.
// Runes of different kinds work together; runes of one kind may all exist, but only the strongest one applies.
// No rate rune goes above +35%. The calendar runes (template/loginRewards.js, +50% exp / drop for two days)
// are a separate source and join the same "strongest wins" rule for the kinds they share.
import {activeLoginRune} from '../../../template/loginRewards.js';

export const HOUR_MS = 3600000;
export const LAB_UNLOCK_PALACE_LEVEL = 8;
export const LAB_MAX_ACTIVE = 24;
export const MAX_RATE_RUNE = 0.35;

/** Per kind: what the number means. `rate` kinds add a share to a reward; `price` lowers a cost; `damage` scales a hit. */
export const LAB_RUNE_KINDS = Object.freeze({
    exp: {id: 'exp', label: 'Руна опыта', effect: 'опыт', type: 'rate'},
    sp: {id: 'sp', label: 'Руна SP', effect: 'SP', type: 'rate'},
    drop: {id: 'drop', label: 'Руна добычи', effect: 'шанс выпадения предметов', type: 'rate'},
    adena: {id: 'adena', label: 'Руна адены', effect: 'адена с монстров', type: 'rate'},
    quest: {id: 'quest', label: 'Руна поручений', effect: 'шанс выпадения квестовых предметов', type: 'rate'},
    teleport: {id: 'teleport', label: 'Руна дорог', effect: 'скидка на телепорт', type: 'price'},
    attack: {id: 'attack', label: 'Руна ярости', effect: 'урон по монстрам', type: 'damage'},
    defense: {id: 'defense', label: 'Руна стойкости', effect: 'урон от монстров', type: 'damage'},
});
export const LAB_RUNE_ORDER = Object.freeze(Object.keys(LAB_RUNE_KINDS));

/** values: the bonus of a kind type at this strength (a share). */
export const LAB_RUNE_TIERS = Object.freeze([
    {id: 1, label: 'Малая', hours: 2, weight: 50, values: {rate: 0.15, price: 0.15, attack: 0.05, defense: 0.03}},
    {id: 2, label: 'Средняя', hours: 6, weight: 35, values: {rate: 0.25, price: 0.25, attack: 0.07, defense: 0.04}},
    {id: 3, label: 'Великая', hours: 12, weight: 15, values: {rate: 0.35, price: 0.35, attack: 0.10, defense: 0.05}},
]);
export const FIZZLE_WEIGHT = 30;

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const tierOf = id => LAB_RUNE_TIERS.find(tier => tier.id === Number(id));

/** The share a rune of this kind and strength gives. */
export function runeValue(kind, tierId) {
    const info = LAB_RUNE_KINDS[kind], tier = tierOf(tierId);
    if (!info || !tier) return 0;
    if (info.type === 'rate') return Math.min(MAX_RATE_RUNE, tier.values.rate);
    if (info.type === 'price') return Math.min(MAX_RATE_RUNE, tier.values.price);
    return tier.values[kind] || 0;
}

/** Runes of the character that have not run out, as {kind, tier, until, value}. */
export function activeLabRunes(session, now = Date.now()) {
    const list = session?.game?.labRunes;
    if (!Array.isArray(list)) return [];
    return list.filter(rune => LAB_RUNE_KINDS[rune?.kind] && tierOf(rune.tier) && number(rune.until) > now)
        .map(rune => ({kind: rune.kind, tier: Number(rune.tier), until: number(rune.until), value: runeValue(rune.kind, rune.tier)}));
}

/** The strongest lab rune of a kind (0 when none works). */
export function labRuneBonus(session, kind, now = Date.now()) {
    let best = 0;
    for (const rune of activeLabRunes(session, now)) if (rune.kind === kind && rune.value > best) best = rune.value;
    return best;
}

// The calendar runes that share a kind with the lab (their +50% stays as it is).
const CALENDAR_RUNES = Object.freeze({exp: 0.5, drop: 0.5});

/** The share a reward is raised by: the strongest of the lab and calendar runes of the kind. */
export function runeRate(session, kind, now = Date.now()) {
    const calendar = CALENDAR_RUNES[kind] && activeLoginRune(session, kind, now) ? CALENDAR_RUNES[kind] : 0;
    return Math.max(calendar, labRuneBonus(session, kind, now));
}

/** Teleport price after the lab's road rune. */
export const teleportPrice = (session, gold, now = Date.now()) =>
    Math.max(1, Math.ceil(number(gold) * (1 - labRuneBonus(session, 'teleport', now))));

// Damage dealt by the hero in one cast is scaled by a one-skill slot, like shots (see functions/game/shots/shots.js).
const attackBoosts = new WeakMap();
export const armAttackRune = (session, now = Date.now()) => {
    const bonus = labRuneBonus(session, 'attack', now);
    if (bonus > 0) attackBoosts.set(session, 1 + bonus); else attackBoosts.delete(session);
};
export const attackRuneBoost = session => attackBoosts.get(session) || 1;
export const clearAttackRune = session => attackBoosts.delete(session);
/** The factor on the damage a monster deals to the hero. */
export const defenseRuneFactor = (session, now = Date.now()) => 1 - labRuneBonus(session, 'defense', now);

// ---- brewing ---------------------------------------------------------------------------------------------------

export const BREW_BASE_DEW = 300;
export const BREW_BASE_GOLD = 2000;
export const BREW_CAP = 5;

const utcDay = now => new Date(now).toISOString().slice(0, 10);
const labLevel = session => Math.max(1, number(session?.game?.builds?.alchemyLab?.currentLvl, 1));
const palaceLevel = session => Math.max(1, number(session?.game?.builds?.palace?.currentLvl, 1));

/** Attempts a day: 1 at lab level 1, one more per two levels, up to BREW_CAP. */
export const brewCap = session => Math.min(BREW_CAP, 1 + Math.floor(labLevel(session) / 2));

function attemptsToday(session, now) {
    const state = session?.game?.labBrew;
    return state && state.day === utcDay(now) ? Math.max(0, Math.floor(number(state.count))) : 0;
}

/** The price of the n-th attempt of the day (n from 1): dew doubles each time, adena grows by a step. */
export const brewPrice = n => ({moonDew: BREW_BASE_DEW * 2 ** (Math.max(1, n) - 1), gold: BREW_BASE_GOLD * Math.max(1, n)});

/** Odds shown to the player: fizzle, then every kind at every strength. */
export function brewOdds() {
    const tierTotal = LAB_RUNE_TIERS.reduce((sum, tier) => sum + tier.weight, 0);
    const kindShare = (100 - FIZZLE_WEIGHT) / LAB_RUNE_ORDER.length;
    return {
        fizzle: FIZZLE_WEIGHT,
        kinds: LAB_RUNE_ORDER.map(kind => ({
            kind, label: LAB_RUNE_KINDS[kind].label, effect: LAB_RUNE_KINDS[kind].effect, chance: kindShare,
            tiers: LAB_RUNE_TIERS.map(tier => ({tier: tier.id, label: tier.label, hours: tier.hours, value: runeValue(kind, tier.id), chance: kindShare * tier.weight / tierTotal})),
        })),
    };
}

export function getLabState(session, now = Date.now()) {
    const used = attemptsToday(session, now), cap = brewCap(session);
    return {
        level: labLevel(session), palaceLevel: palaceLevel(session), unlockPalaceLevel: LAB_UNLOCK_PALACE_LEVEL,
        unlocked: palaceLevel(session) >= LAB_UNLOCK_PALACE_LEVEL,
        cap, used, left: Math.max(0, cap - used), next: used < cap ? brewPrice(used + 1) : null,
        balance: {gold: Math.max(0, number(session?.game?.inventory?.gold)), moonDew: Math.max(0, number(session?.game?.inventory?.moonDew))},
        active: activeLabRunes(session, now).sort((a, b) => b.until - a.until).map(rune => ({
            ...rune, kindLabel: LAB_RUNE_KINDS[rune.kind].label, effect: LAB_RUNE_KINDS[rune.kind].effect,
            tierLabel: tierOf(rune.tier).label, working: rune.value >= labRuneBonus(session, rune.kind, now),
        })),
        odds: brewOdds(),
    };
}

function roll(random) {
    if (random() * 100 < FIZZLE_WEIGHT) return null;
    const kind = LAB_RUNE_ORDER[Math.min(LAB_RUNE_ORDER.length - 1, Math.floor(random() * LAB_RUNE_ORDER.length))];
    const total = LAB_RUNE_TIERS.reduce((sum, tier) => sum + tier.weight, 0);
    let point = random() * total, tier = LAB_RUNE_TIERS[LAB_RUNE_TIERS.length - 1];
    for (const candidate of LAB_RUNE_TIERS) {
        if (point < candidate.weight) { tier = candidate; break; }
        point -= candidate.weight;
    }
    return {kind, tier: tier.id};
}

/** One attempt. The caller saves the session. */
export function brewLabRune(session, {now = Date.now(), random = Math.random} = {}) {
    const game = session?.game, inventory = game?.inventory;
    if (!inventory) return {ok: false, reason: 'inventory_missing'};
    if (palaceLevel(session) < LAB_UNLOCK_PALACE_LEVEL) return {ok: false, reason: 'lab_locked', state: getLabState(session, now)};
    if (game.builds?.alchemyLab?.upgradeStartedAt) return {ok: false, reason: 'lab_upgrading', state: getLabState(session, now)};
    const used = attemptsToday(session, now);
    if (used >= brewCap(session)) return {ok: false, reason: 'no_attempts', state: getLabState(session, now)};
    const price = brewPrice(used + 1);
    if (number(inventory.moonDew) < price.moonDew) return {ok: false, reason: 'not_enough_moon_dew', price, state: getLabState(session, now)};
    if (number(inventory.gold) < price.gold) return {ok: false, reason: 'not_enough_gold', price, state: getLabState(session, now)};
    inventory.moonDew = number(inventory.moonDew) - price.moonDew;
    inventory.gold = number(inventory.gold) - price.gold;
    game.labBrew = {day: utcDay(now), count: used + 1};
    const outcome = roll(random);
    const kept = activeLabRunes(session, now).map(({kind, tier, until}) => ({kind, tier, until}));
    let rune = null;
    if (outcome) {
        rune = {kind: outcome.kind, tier: outcome.tier, until: now + tierOf(outcome.tier).hours * HOUR_MS};
        kept.push(rune);
    }
    game.labRunes = kept.sort((a, b) => b.until - a.until).slice(0, LAB_MAX_ACTIVE);
    session.needsSave = true;
    return {
        ok: true, fizzled: !rune, spent: price, state: getLabState(session, now),
        rune: rune && {...rune, value: runeValue(rune.kind, rune.tier), kindLabel: LAB_RUNE_KINDS[rune.kind].label, tierLabel: tierOf(rune.tier).label},
    };
}
