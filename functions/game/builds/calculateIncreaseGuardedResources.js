export default function (buildTemplate, currentLvl) {
        let increaseFactor = 1;
        let newResourcesCounter = {};

        for (let [resourceName, resource] of Object.entries(buildTemplate.bonusEffect)) {
            if (resourceName !== "guardedGold" && resourceName !== "guardedCrystals" && resourceName !== "guardedIronOre") {
                continue;
            }

            if (resourceName === "guardedGold") {
                increaseFactor = 1.017;
            }

            if (resourceName === "guardedCrystals") {
                increaseFactor = 1.03 * currentLvl;
            }

            if (resourceName === "guardedIronOre") {
                increaseFactor = 1.025;
            }

            newResourcesCounter[resourceName] = Math.ceil(resource * increaseFactor * currentLvl);
        }

        return newResourcesCounter;
};