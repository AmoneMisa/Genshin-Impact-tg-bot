import upgradeBuild from "./upgradeBuild.js";
import calculateOptimalSpeedUpCost from "./calculateOptimalSpeedUpCost.js";

/**
 * Ускоряет апгрейд постройки, списывая кристаллы
 * @param {string} buildName - название постройки
 * @param {Object} build - объект постройки
 * @param {Object} inventory - инвентарь игрока
 * @returns {boolean} true если ускорение прошло успешно, false если ресурсов недостаточно
 */
export default function speedUpBuild(buildName, build, inventory) {
    const speedupCost = calculateOptimalSpeedUpCost(buildName, build);

    // Проверка на достаточность кристаллов
    if (inventory.crystals < speedupCost) {
        return false; // недостаточно ресурсов
    }

    // Сброс таймера
    if (build.upgradeTimerId) {
        clearTimeout(build.upgradeTimerId);
        build.upgradeTimerId = null;
    }

    build.upgradeStartedAt = null;

    // Завершаем апгрейд
    upgradeBuild(build);

    // Списываем кристаллы
    inventory.crystals -= speedupCost;

    return true;
}
