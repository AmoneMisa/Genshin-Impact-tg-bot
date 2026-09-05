import getRandom from '../../getters/getRandom.js';

function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function nextSwordReset(now = Date.now()) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

export function getSwordState(session, now = Date.now()) {
    const resetAt = Math.max(0, number(session?.timerSwordCallback));
    const remainMs = Math.max(0, resetAt - now);

    return {
        length: number(session?.sword),
        resetAt,
        remainMs,
        canRoll: remainMs <= 0,
        decreaseImmune: Boolean(session?.swordImmune),
        forceDecrease: Boolean(session?.immuneToUpSword),
    };
}

export function rollSword(session, options = {}) {
    const now = number(options.now, Date.now());
    const randomInt = options.randomInt || getRandom;
    const before = getSwordState(session, now);

    if (!before.canRoll) {
        return {
            ok: false,
            reason: 'cooldown',
            sword: before,
        };
    }

    session.sword = before.length;
    session.timerSwordCallback = options.resetAt ?? nextSwordReset(now);

    let delta;
    let modifier = 'normal';

    if (session.swordImmune) {
        // Купленный иммунитет гарантирует отсутствие уменьшения и расходуется
        // ровно на следующую попытку.
        delta = randomInt(0, 15);
        session.swordImmune = false;
        modifier = 'decrease_immune';
    } else if (session.immuneToUpSword) {
        // Негативный эффект из сундука гарантирует уменьшение и тоже одноразовый.
        delta = randomInt(-10, -1);
        session.immuneToUpSword = false;
        modifier = 'force_decrease';
    } else {
        delta = randomInt(-10, 15);
    }

    session.sword += delta;

    return {
        ok: true,
        action: 'roll',
        delta,
        modifier,
        previousLength: before.length,
        sword: getSwordState(session, now),
    };
}
