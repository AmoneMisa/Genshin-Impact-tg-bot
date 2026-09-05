import buildsTemplate from "../../../template/buildsTemplate.js";
import calculateUpgradeCosts from "./calculateUpgradeCosts.js";

/**
 * Списывает ресурсы игрока при апгрейде постройки
 * @param {number} currentLvl - текущий уровень постройки
 * @param {string} buildName - название постройки
 * @param {Object} inventory - инвентарь игрока
 * @returns {boolean} true если апгрейд возможен и ресурсы списаны, false если ресурсов недостаточно
 */
export default function applyUpgradeCosts(currentLvl, buildName, inventory) {
    const buildTemplate = buildsTemplate[buildName];
    if (!buildTemplate) {
        throw new Error(`Неизвестная постройка: ${buildName}`);
    }

    const nextLvl = currentLvl + 1;
    const currentUpgrade = calculateUpgradeCosts(buildTemplate.upgradeCosts, nextLvl);

    // Проверка на наличие ресурсов
    if (
        inventory.crystals < currentUpgrade.crystals ||
        inventory.gold < currentUpgrade.gold ||
        inventory.ironOre < currentUpgrade.ironOre
    ) {
        return false; // недостаточно ресурсов
    }

    // Списание ресурсов
    inventory.crystals -= currentUpgrade.crystals;
    inventory.gold -= currentUpgrade.gold;
    inventory.ironOre -= currentUpgrade.ironOre;

    return true;
}
