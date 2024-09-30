import getBuildList from './getBuildList.js';
import buildsTemplate from '../../../template/buildsTemplate.js';
import getSession from '../../getters/getSession.js';

export default async function (buildName, build, chatId, userId) {
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
    let result = false;

    if (!requirements.length) {
        result = true;
    }

    requirements.forEach(requirement => {
        let build = buildList[requirement.name];

        if (!build) {
            result = false;
        }

        result = build.currentLvl >= requirement.level;
    });

    return result;
}

function checkCharacterRequirements({stats, gameClass}, requirements) {
    let result = false;

    if (!requirements.length) {
        result = true;
    }

    if (!stats || !gameClass) {
        result = false;
    }

    requirements.forEach(requirement => {
        if (!stats[requirement.name] && !gameClass[requirement.name]) {
            result = false;
        }

        for (let [key, value] of Object.entries(requirement)) {
            if (stats[key]) {
                result = stats[key] >= value;
            }

            if (gameClass[key]) {
                result = gameClass[key] >= value;
            }
        }
    });

    return result;
}