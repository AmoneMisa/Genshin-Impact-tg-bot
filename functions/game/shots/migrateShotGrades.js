// Shots stop at S: charges stored for the old S80 / S84 grades are plain S charges now.
const KINDS = ['soulshot', 'spiritshot', 'blessedshot'];
const LEGACY = KINDS.flatMap(kind => ['S80', 'S84'].map(grade => [`${kind}_${grade}`, `${kind}_S`]));

function moveCounters(counters) {
    if (!counters || typeof counters !== 'object' || Array.isArray(counters)) return false;
    let changed = false;
    for (const [from, to] of LEGACY) {
        const amount = Math.floor(Number(counters[from]) || 0);
        if (!Object.hasOwn(counters, from)) continue;
        if (amount > 0) counters[to] = Math.floor(Number(counters[to]) || 0) + amount;
        delete counters[from];
        changed = true;
    }
    return changed;
}

export function migrateShotGrades(session) {
    const game = session?.game;
    if (!game) return false;
    let changed = moveCounters(game.inventory?.materials);
    changed = moveCounters(game.warehouse?.materials) || changed;
    // attached letter rewards: an object with materials, or a list of rows that carry materials or a single key
    const legacyTarget = new Map(LEGACY);
    for (const letter of game.mailbox || []) {
        const rewards = letter.rewards;
        changed = moveCounters(rewards?.materials) || changed;
        if (!Array.isArray(rewards)) continue;
        for (const row of rewards) {
            changed = moveCounters(row?.materials) || changed;
            if (row && legacyTarget.has(row.key)) { row.key = legacyTarget.get(row.key); changed = true; }
        }
    }
    if (changed) session.needsSave = true;
    return changed;
}
