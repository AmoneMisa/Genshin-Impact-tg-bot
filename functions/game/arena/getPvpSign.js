import { normalizeArenaInventory } from './arenaInventory.js';

/**
 * Возвращает числовые PvP-модификаторы из уже загруженной сессии.
 * I/O здесь не нужен: медаль хранится в инвентаре игрока.
 */
export default function getPvpSign(session) {
    const game = session?.game;
    if (!game) {
        return { increasePvpDamage: 1, decreaseIncomingPvpDamage: 0 };
    }

    const medal = normalizeArenaInventory(game).pvpSign;
    const effects = Array.isArray(medal?.effects) ? medal.effects : [];
    const increase = effects.find(stat => stat?.name === 'increasePvpDamage');
    const decrease = effects.find(stat => stat?.name === 'decreaseIncomingPvpDamage');

    return {
        increasePvpDamage: Number(increase?.value) || 1,
        decreaseIncomingPvpDamage: Number(decrease?.value) || 0,
    };
}
