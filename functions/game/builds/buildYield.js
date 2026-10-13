// Caps of what the buildings give a hero, so the hero does not outgrow the hunt: like the offline farm, a collection
// of experience or skill points is a part of a level step, not a pile of levels. Stored amounts are clamped to the cap
// when the hourly tick adds to them and when the player collects.
import {levelNeed, EXP_RATE} from '../player/vitality.js';
import {customSpBudget} from '../player/spEconomy.js';

/** Share of one level step (experience) and of one level's skill points that a building can store. */
export const BUILD_EXP_SHARE = 0.12;
export const BUILD_SP_SHARE = 1.5;

const level = session => Math.max(1, Number(session?.game?.stats?.lvl) || 1);

/** The most base experience a trainee area keeps: after the x5 rate it is BUILD_EXP_SHARE of the current level. */
export function buildExpCap(session) {
    const need = levelNeed(level(session));
    return Math.max(1, Math.floor(need * BUILD_EXP_SHARE / EXP_RATE));
}

/** The most skill points an academy keeps. */
export function buildSpCap(session) {
    return Math.max(1, Math.round(customSpBudget(level(session)) * BUILD_SP_SHARE));
}

/** The storage cap of a production kind for this hero, or Infinity for gold, ore and the rest. */
export function buildStorageCap(session, resourceType) {
    if (resourceType === 'experience') return buildExpCap(session);
    if (resourceType === 'sp') return buildSpCap(session);
    return Infinity;
}
