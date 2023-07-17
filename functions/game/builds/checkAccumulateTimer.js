const {sessions} = require("../../../data");
const getMembers = require("../../getters/getMembers");
const getBuildsList = require("./getBuildList");
const buildsTemplate = require("../../../templates/buildsTemplate");
const calculateIncreaseInResourceExtraction = require("./calculateIncreaseInResourceExtraction");

module.exports = async function () {
    for (let chatId of Object.keys(sessions)) {
        for (let userId of Object.keys(getMembers(chatId))) {
            for (let [buildName, build] of Object.entries(await getBuildsList(chatId, userId))) {
                let buildTemplate = buildsTemplate[buildName];

                if (build.upgradeStartedAt) {
                    continue;
                }

                let currentTime = new Date().getTime();
                let maxWorkHoursWithoutCollection = buildTemplate.maxWorkHoursWithoutCollection;

                if (build.lastCollectAt && (build.lastCollectAt + (maxWorkHoursWithoutCollection * 60 * 60 * 1000)) < currentTime) {
                    continue;
                }

                if (!build.lastCollectAt) {
                    build.lastCollectAt = currentTime;
                }

                if (build.currentLvl === 1) {
                    build.resourceCollected += Math.ceil(buildTemplate.productionPerHour);
                } else {
                    build.resourceCollected += Math.ceil(buildTemplate.productionPerHour * calculateIncreaseInResourceExtraction(buildName, build.currentLvl));
                }
            }
        }
    }
}