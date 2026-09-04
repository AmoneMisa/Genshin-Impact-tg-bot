/**
 * Возвращает числовые PvP-модификаторы из уже загруженной сессии.
 * Старый Mongo-порт сделал эту функцию async и заставил синхронный combat
 * получать Promise вместо модификаторов. Здесь I/O не нужен: медаль уже лежит
 * в инвентаре игрока.
 */
export default function getPvpSign(session) {
    const arena = session?.game?.inventory?.arena;
    const legacy = arena?.items?.[1];
    const medal = arena?.pvpSign || legacy?.pvpSign || (legacy?.name === 'pvpSign' ? legacy : null);
    const effects = Array.isArray(medal?.effects) ? medal.effects : [];

    const increase = effects.find(stat => stat?.name === 'increasePvpDamage');
    const decrease = effects.find(stat => stat?.name === 'decreaseIncomingPvpDamage');

    return {
        increasePvpDamage: Number(increase?.value) || 1,
        decreaseIncomingPvpDamage: Number(decrease?.value) || 0,
    };
}
