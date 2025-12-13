import buildsTemplate from "../../../template/buildsTemplate.js";

/**
 * Повышает уровень постройки
 * @param {Object} build - объект постройки
 * @param {string} buildName - название постройки
 * @returns {boolean} true если апгрейд успешен, false если достигнут максимум
 */
export default function upgradeBuild(build, buildName) {
    const template = buildsTemplate[buildName];
    const maxLvl = template?.maxLvl || Infinity;

    if (build.currentLvl >= maxLvl) {
        return false; // достигнут максимум
    }

    build.currentLvl++;
    return true;
}
