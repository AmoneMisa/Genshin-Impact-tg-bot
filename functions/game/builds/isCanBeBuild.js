const getBuildList = require("./getBuildList");
const buildsTemplate = require("../../../templates/buildsTemplate");
const getSession = require("../../getters/getSession");

module.exports = async function (buildName, build, chatId, userId) {
    if (!buildsTemplate[buildName].hasOwnProperty("upgradeRequirements")) {
        return true;
    }

    let buildList = await getBuildList(chatId, userId);
    let upgrades = buildsTemplate[buildName].upgradeRequirements[build.currentLvl - 1];

    for (let [upgradeKey, upgradeValue] of Object.entries(upgrades)) {
        if (upgradeKey === "buildRequirements") {
            let checkedBuild = checkBuildRequirements(buildList, upgradeValue);

            if (!checkedBuild) {
                return false;
            }
        }

        if (upgradeKey === "characterRequirements") {
            let session = await getSession(chatId, userId);
            let checkedCharacter = checkCharacterRequirements(session.game, upgradeValue);

            if (!checkedCharacter) {
                return false;
            }
        }
    }

    return true;
}

function checkBuildRequirements(buildList, requirements) {
    if (!requirements.length) {
        return true;
    }

    requirements.forEach(requirement => {
        let build = buildList[requirement.name];
        if (!build) {
            return false;
        }

        if (build.currentLvl < requirement.level) {
            return false;
        }
    });

    return true;
}

function checkCharacterRequirements({stats, gameClass}, requirements) {
    if (!requirements.length) {
        return true;
    }

    if (!stats || !gameClass) {
        return false;
    }

    requirements.forEach(requirement => {
        if (!stats[requirement.name] && !gameClass[requirement.name]) {
            return false;
        }

        for (let [key, value] of Object.entries(requirement)) {
            if (stats[key]) {
                return stats[key] >= value;
            }

            if (gameClass[key]) {
                return gameClass[key] >= value;
            }
        }
    });

    return true;
}