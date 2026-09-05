import calculateIncreaseUpgradeTime from './calculateUpgradeTime.js';
import buildsTemplate from '../../../template/buildsTemplate.js';

/**
 * Вычисляет оставшееся время улучшения здания в миллисекундах.
 * Таймер относится к следующему уровню, поэтому для currentLvl=N ищем
 * конфигурацию upgradeTime для level=N+1.
 */
export default function (buildName, build) {
    const buildTemplate = buildsTemplate[buildName];
    if (!buildTemplate) {
        throw new Error("Не найден шаблон здания");
    }

    const currentLvl = Number(build.currentLvl);
    const maxLvl = Number(buildTemplate.maxLvl || 30);
    if (!Number.isFinite(currentLvl) || currentLvl < 1 || currentLvl > maxLvl) {
        throw new Error("Указан некорректный уровень!");
    }
    if (!build.upgradeStartedAt) {
        throw new Error("Нет времени начала улучшения");
    }

    const targetLvl = currentLvl + 1;
    const exactUpgrade = buildTemplate.upgradeTime?.find((item) => Number(item.level) === targetLvl);
    const buildTime = exactUpgrade?.time ?? calculateIncreaseUpgradeTime(buildName, targetLvl);
    const upgradeEndedAt = Number(build.upgradeStartedAt) + Number(buildTime) * 60 * 60 * 1000;

    return Math.max(0, upgradeEndedAt - Date.now());
}
