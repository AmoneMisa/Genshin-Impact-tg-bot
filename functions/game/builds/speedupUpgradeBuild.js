import upgradeBuild from './upgradeBuild.js';
import calculateOptimalSpeedUpCost from './calculateOptimalSpeedUpCost.js';

export default function (buildName, build, inventory) {
    let speedupCost = calculateOptimalSpeedUpCost(buildName, build)
    clearTimeout(build.upgradeTimerId);
    build.upgradeStartedAt = null;
    upgradeBuild(build);
    inventory.crystals = Math.max(0, inventory.crystals - speedupCost);
}