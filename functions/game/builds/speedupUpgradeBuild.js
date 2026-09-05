import upgradeBuild from "./upgradeBuild.js";
import calculateOptimalSpeedUpCost from "./calculateOptimalSpeedUpCost.js";

/**
 * Ускоряет апгрейд постройки, списывая кристаллы.
 */
export default function speedUpBuild(buildName, build, inventory) {
    const speedupCost = calculateOptimalSpeedUpCost(buildName, build);

    if (inventory.crystals < speedupCost) {
        return false;
    }

    if (build.upgradeTimerId) {
        clearTimeout(build.upgradeTimerId);
        build.upgradeTimerId = null;
    }

    const upgraded = upgradeBuild(build, buildName);
    if (!upgraded) {
        return false;
    }

    build.upgradeStartedAt = null;
    inventory.crystals -= speedupCost;

    return true;
}
