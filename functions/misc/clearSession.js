/**
 * Очищает временные поля в игровом объекте
 * @param {Object} session - объект игровой сессии
 */
export default function clearTemporaryFields(session) {
    const safeDelete = (obj, keys) => {
        if (!obj) return;
        for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                delete obj[key];
            }
        }
    };

    // Очистка данных босса
    safeDelete(session?.game?.gameClass?.boss, ["isDead", "damagedHp", "hp", "damage"]);

    // Очистка данных построек
    safeDelete(session?.game?.builds, ["stealImmuneTimer", "chanceToSteal", "stealChance"]);

    // Очистка reddit
    safeDelete(session?.game, ["reddit"]);

    // Очистка таймера босса
    safeDelete(session?.game, ["timerBossCallback"]);
}
