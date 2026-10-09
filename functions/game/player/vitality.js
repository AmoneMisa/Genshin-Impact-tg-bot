// Experience rate and Vitality (Lineage II): the game plays like a x5 server. Every experience reward is
// multiplied by EXP_RATE, and Vitality adds a bonus on top while the bar lasts.
//
//   Vitality is 0..20000 points. The stage of the bar sets the bonus (x1 .. x3 experience, +200% at the
//   top). Earning experience drains the bar - a full bar carries about BAR_LEVELS levels of experience -
//   and it refills over a day. New characters start with a full bar.
//
// Stored as session.game.vitality = {points, at}; the refill is computed when the bar is read.
import levelsTemplate, { MAX_LEVEL } from '../../../template/levelsTemplate.js';

export { MAX_LEVEL };
export const EXP_RATE = 5;
export const VITALITY_MAX = 20000;
export const VITALITY_REFILL_MS = 24 * 60 * 60 * 1000;
export const BAR_LEVELS = 2;

/** Bar stages: from this many points the experience is multiplied by `bonus`. */
export const VITALITY_STAGES = Object.freeze([
    {stage: 0, from: 0, bonus: 1},
    {stage: 1, from: 240, bonus: 1.5},
    {stage: 2, from: 2000, bonus: 2},
    {stage: 3, from: 13000, bonus: 2.5},
    {stage: 4, from: 17000, bonus: 3},
]);

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function stageOf(points) {
    let result = VITALITY_STAGES[0];
    for (const stage of VITALITY_STAGES) if (points >= stage.from) result = stage;
    return result;
}

/** Brings the bar up to `now` (refill) and returns it. */
export function readVitality(session, now = Date.now()) {
    const game = session.game;
    const stored = game.vitality;
    if (!stored || !Number.isFinite(Number(stored.points))) {
        game.vitality = {points: VITALITY_MAX, at: now};
        return game.vitality;
    }
    const elapsed = Math.max(0, now - number(stored.at, now));
    stored.points = Math.min(VITALITY_MAX, Math.max(0, number(stored.points)) + elapsed / VITALITY_REFILL_MS * VITALITY_MAX);
    stored.at = now;
    return stored;
}

/** The bar for the Mini App: points, stage and the experience multiplier. */
export function getVitalityState(session, now = Date.now()) {
    const bar = readVitality(session, now);
    const stage = stageOf(bar.points);
    return {points: Math.round(bar.points), max: VITALITY_MAX, stage: stage.stage, bonus: stage.bonus, rate: EXP_RATE};
}

export const levelNeed = level => levelsTemplate.find(entry => entry.lvl === level)?.needExp || 0;

export const isMaxLevel = session => number(session?.game?.stats?.lvl, 1) >= MAX_LEVEL;

/**
 * Credits experience: `base` is the reward before the rate. Returns {gained, bonus} - the experience
 * actually added (0 at the maximum level) and the Vitality multiplier that applied. The caller runs setLevel.
 */
export function gainExp(session, base, {now = Date.now()} = {}) {
    const amount = Math.max(0, number(base));
    if (!amount || isMaxLevel(session)) return {gained: 0, bonus: 1};
    const stats = session.game.stats;
    const bar = readVitality(session, now);
    const {bonus} = stageOf(bar.points);
    const gained = Math.ceil(amount * EXP_RATE * bonus);
    const need = levelNeed(number(stats.lvl, 1));
    if (need) bar.points = Math.max(0, bar.points - gained / need * VITALITY_MAX / BAR_LEVELS);
    stats.currentExp = number(stats.currentExp) + gained;
    return {gained, bonus};
}
