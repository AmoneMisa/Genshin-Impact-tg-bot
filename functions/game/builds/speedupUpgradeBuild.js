const upgradeBuild = require('./upgradeBuild');
const calculateOptimalSpeedUpCost = require("./calculateOptimalSpeedUpCost");

module.exports = function (buildName, build, inventory) {
    let speedupCost = calculateOptimalSpeedUpCost(buildName, build)
    clearTimeout(build.upgradeTimerId);
    build.upgradeStartedAt = null;
    upgradeBuild(build);
    inventory.crystals = Math.max(0, inventory.crystals - speedupCost);
}