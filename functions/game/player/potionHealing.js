export const HP_POTION_SECONDS = 15;

// Persisted elapsed-time ticks work across restarts and delayed scheduler runs.
export function settlePotionHealing(session, now, maxHp) {
    const pending = session?.game?.hpPotion;
    const stats = session?.game?.gameClass?.stats;
    if (!pending || !stats) return false;
    if (Number(stats.hp) <= 0) { delete session.game.hpPotion; session.needsSave = true; return true; }
    const ticks = Math.min(HP_POTION_SECONDS, Math.max(0, Math.floor((now-pending.startedAt)/1000)));
    const due = pending.amount*ticks/HP_POTION_SECONDS;
    const add = Math.max(0,due-pending.delivered);
    if (!add && ticks < HP_POTION_SECONDS) return false;
    stats.hp = Math.min(maxHp, Number(stats.hp)+add);
    pending.delivered = due;
    if (ticks === HP_POTION_SECONDS) delete session.game.hpPotion;
    session.needsSave = true;
    return true;
}

export function queuePotionHealing(session, amount, now = Date.now()) {
    // Reusing a potion refreshes one healing effect; it never multiplies tick rates.
    const old = session.game.hpPotion;
    session.game.hpPotion = {amount:Math.max(amount,old ? old.amount-old.delivered : 0),delivered:0,startedAt:now};
}
