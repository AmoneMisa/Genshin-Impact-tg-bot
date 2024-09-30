import {BuildUpgradeTimeType} from "./BuildUpgradeTimeType";

export type BuildType = {
    name: string,
    description: string,
    startLvl: number,
    updateCostGold: number,
    updateCostCrystal: number,
    upgradeTime: BuildUpgradeTimeType[], // часы
    maxLvl: number,
    productionPerHour: number,
    available: boolean,
    maxWorkHoursWithoutCollection: number,
    upgradeCosts: [{
        level: number,
        gold: number,
        crystals: number,
        ironOre: number
    }],
    resourcesType: string | "gold" | "crystals" | "ironOre",
    upgradeRequirements: [
        { level: 2, buildRequirements: [{ name: "palace", level: 1 }], characterRequirements: [{ lvl: 1 }] }
    ]
}