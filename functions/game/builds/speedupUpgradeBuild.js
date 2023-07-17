const upgradeBuild = require('./upgradeBuild');
const calculateOptimalSpeedUpCost = require("./calculateOptimalSpeedUpCost");

module.exports = function (buildName, build, session) {
    let speedupCost = calculateOptimalSpeedUpCost(buildName, build)
    clearTimeout(build.upgradeTimerId);
    build.upgradeStartedAt = null;
    upgradeBuild(build);
    session.game.inventory.crystals = Math.max(0, session.game.inventory.crystals - speedupCost);
}