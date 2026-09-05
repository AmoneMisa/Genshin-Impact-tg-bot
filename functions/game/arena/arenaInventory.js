import pvpSignTemplate from '../../../template/pvpSignTemplate.js';

function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function effectValue(effects, name, fallback = 0) {
    const value = effects?.find(effect => effect?.name === name)?.value;
    return number(value, fallback);
}

function cloneEffects(effects) {
    return Array.isArray(effects)
        ? effects.map(effect => ({...effect}))
        : [];
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

/**
 * Определяет следующее фактическое улучшение по текущим эффектам, а не только
 * по lvl. Это позволяет безопасно продолжать старые медали, которые legacy UI
 * раньше мог перескочить на upgrade с неправильным индексом.
 */
export function getArenaMedalUpgradeState(game) {
    const arena = normalizeArenaInventory(game);
    const medal = arena.pvpSign;
    if (!medal) {
        return { ok: false, reason: 'no_medal', tokens: arena.tokens };
    }

    const upgrades = Array.isArray(medal.upgrades) ? medal.upgrades : [];
    const currentDamage = effectValue(medal.effects, 'increasePvpDamage', 1);
    const currentDefense = effectValue(medal.effects, 'decreaseIncomingPvpDamage', 0);
    const upgradeIndex = upgrades.findIndex(upgrade => {
        const damage = effectValue(upgrade?.effects, 'increasePvpDamage', currentDamage);
        const defense = effectValue(upgrade?.effects, 'decreaseIncomingPvpDamage', currentDefense);
        return damage > currentDamage || defense > currentDefense;
    });

    if (upgradeIndex < 0) {
        return {
            ok: false,
            reason: 'max_level',
            medal,
            tokens: arena.tokens,
            currentLevel: Math.max(1, Math.floor(number(medal.lvl, 1))),
        };
    }

    const upgrade = upgrades[upgradeIndex];
    const currentLevel = Math.max(1, Math.floor(number(medal.lvl, 1)));
    const nextLevel = Math.max(currentLevel + 1, upgradeIndex + 2);
    const cost = Math.max(0, number(upgrade.cost));

    return {
        ok: true,
        medal,
        currentLevel,
        nextLevel,
        upgradeIndex,
        cost,
        effects: cloneEffects(upgrade.effects),
        tokens: arena.tokens,
        canAfford: arena.tokens >= cost,
    };
}

export function upgradeArenaMedal(game) {
    const state = getArenaMedalUpgradeState(game);
    if (!state.ok) return state;
    if (!spendArenaTokens(game, state.cost)) {
        return { ...state, ok: false, reason: 'not_enough_tokens' };
    }

    const arena = normalizeArenaInventory(game);
    const medal = arena.pvpSign;
    medal.lvl = state.nextLevel;
    medal.effects = cloneEffects(state.effects);
    arena.items[1] = { pvpSign: medal };

    return {
        ok: true,
        medal,
        spent: state.cost,
        tokens: arena.tokens,
        level: medal.lvl,
    };
}
