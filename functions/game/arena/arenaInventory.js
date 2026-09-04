import pvpSignTemplate from '../../../template/pvpSignTemplate.js';

function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Нормализует две исторические формы arena inventory:
 * - новая/удобная: { tokens, pvpSign }
 * - старая: items: [{ tokens }, { pvpSign }]
 *
 * На переходном этапе держим обе формы синхронно, чтобы Mini App и старые
 * callback-обработчики не расходились по данным.
 */
export function normalizeArenaInventory(game) {
    if (!game.inventory) game.inventory = {};
    if (!game.inventory.arena || typeof game.inventory.arena !== 'object') {
        game.inventory.arena = { name: 'Предметы арены', items: [{ tokens: 0 }, { pvpSign: null }] };
    }

    const arena = game.inventory.arena;
    if (!Array.isArray(arena.items)) arena.items = [{ tokens: 0 }, { pvpSign: null }];
    if (!arena.items[0] || typeof arena.items[0] !== 'object') arena.items[0] = { tokens: 0 };
    if (!arena.items[1] || typeof arena.items[1] !== 'object') arena.items[1] = { pvpSign: null };

    const legacyTokens = arena.items[0]?.tokens ?? arena.items?.tokens;
    const legacySign = arena.items[1]?.pvpSign
        ?? (arena.items[1]?.name === 'pvpSign' ? arena.items[1] : null);

    arena.tokens = number(arena.tokens ?? legacyTokens);
    arena.pvpSign = arena.pvpSign ?? legacySign ?? null;
    arena.items[0].tokens = arena.tokens;
    arena.items[1] = { pvpSign: arena.pvpSign };

    return arena;
}

export function addArenaTokens(game, amount) {
    const arena = normalizeArenaInventory(game);
    arena.tokens = Math.max(0, number(arena.tokens) + number(amount));
    arena.items[0].tokens = arena.tokens;
    return arena.tokens;
}

export function spendArenaTokens(game, amount) {
    const arena = normalizeArenaInventory(game);
    const cost = Math.max(0, number(amount));
    if (arena.tokens < cost) return false;
    arena.tokens -= cost;
    arena.items[0].tokens = arena.tokens;
    return true;
}

export function grantArenaMedal(game, now = Date.now()) {
    const arena = normalizeArenaInventory(game);
    if (arena.pvpSign) return arena.pvpSign;

    arena.pvpSign = JSON.parse(JSON.stringify(pvpSignTemplate));
    arena.pvpSign.lifeTime = now + number(pvpSignTemplate.lifeTime);
    arena.items[1] = { pvpSign: arena.pvpSign };
    return arena.pvpSign;
}
