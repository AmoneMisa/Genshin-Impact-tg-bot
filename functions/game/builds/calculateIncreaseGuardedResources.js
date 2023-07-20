module.exports = function (buildTemplate, currentLvl) {
        let increaseFactor;
        let newResourcesCounter = {};

        for (let [resourceName, resource] of Object.entries(buildTemplate.bonusEffect)) {
            if (resourceName === "guardedGold") {
                increaseFactor = 1.017;
                newResourcesCounter["guardedGold"] = Math.ceil(resource * increaseFactor * currentLvl);
            }

            if (resourceName === "guardedCrystals") {
                increaseFactor = 1.03 * currentLvl;
                newResourcesCounter["guardedCrystals"] = Math.ceil(resource * increaseFactor * currentLvl);
            }

            if (resourceName === "guardedIronOre") {
                increaseFactor = 1.025;
                newResourcesCounter["guardedIronOre"] = Math.ceil(resource * increaseFactor * currentLvl);
            }
        }

        return newResourcesCounter;
};