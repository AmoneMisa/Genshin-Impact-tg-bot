const getBuildList = require("./getBuildList");
const buildsTemplate = require("../../../templates/buildsTemplate");
const getSession = require("../../getters/getSession");

module.exports = function (buildName, build, chatId, userId) {
    if (!buildsTemplate[buildName].hasOwnProperty("upgradeRequirements")) {
        return true;
    }
    let buildList = getBuildList(chatId, userId);
    let upgrades = buildsTemplate[buildName].upgradeRequirements[build.currentLvl - 1];

    for (let [upgradeKey, upgradeValue] of Object.entries(upgrades)) {
        if (upgradeKey === "buildRequirements") {
            let checkedBuild = checkBuildRequirements(buildList, upgradeKey, upgradeValue);
            if (!checkedBuild) {
                return false;
            }
        }

        if (upgradeKey === "characterRequirements") {
            let session = getSession(chatId, userId);
            let checkedCharacter = checkCharacterRequirements(session.game, upgradeKey, upgradeValue);

            if (!checkedCharacter) {
                return false;
            }
        }
    }
}

function checkBuildRequirements(buildList, upgradeKey, upgradeValue) {
    let build = buildList[upgradeKey];

    if (!build) {
        return false;
    }

    return build.currentLvl === upgradeValue;
}

const characterStatsEnum = ["attack", "defence", "criticalChance", "criticalDamage", "reduceIncomingDamage", "additionalDamage", "hp", "mp", "hpRestoreSpeed", "mpRestoreSpeed"];

function checkCharacterRequirements({stats, gameClass}, upgradeKey, upgradeValue) {
    if (!stats || !gameClass) {
        return false;
    }

    if (upgradeKey === "level") {
        return stats.level === upgradeValue;
    }

    if (characterStatsEnum.includes(upgradeKey)) {
        return gameClass[upgradeKey] === upgradeValue;
    }
}