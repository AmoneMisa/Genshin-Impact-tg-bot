module.exports = function (build, lvl) {
        let increaseFactor;
        let newResourcesCounter = {};

        for (let [resourceName, resource] of Object.entries(build.bonusEffect)) {
            if (resourceName === "guardedGold") {
                increaseFactor = 0.017;
                newResourcesCounter["guardedGold"] = resource / increaseFactor * lvl;
            }

            if (resourceName === "guardedCrystals") {
                increaseFactor = 0.03 * lvl;
                newResourcesCounter["guardedCrystals"] = resource / increaseFactor * lvl;
            }

            if (resourceName === "guardedIronOre") {
                increaseFactor = 0.025;
                newResourcesCounter["guardedIronOre"] = resource / increaseFactor * lvl;
            }
        }

        return newResourcesCounter;
};