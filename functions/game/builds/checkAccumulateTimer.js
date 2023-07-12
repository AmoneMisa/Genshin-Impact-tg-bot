const {sessions} = require("../../../data");
const getMembers = require("../../getters/getMembers");
const getBuildsList = require("./getBuildList");
const buildsTemplate = require("../../../templates/buildsTemplate");
const calculateIncreaseInResourceExtraction = require("./calculateIncreaseInResourceExtraction");

module.exports = function () {
    for (let chatId of Object.keys(sessions)) {
        for (let userId of Object.keys(getMembers(chatId))) {
            for (let [buildName, build] of Object.entries(getBuildsList(chatId, userId))) {
                let buildTemplate = buildsTemplate[buildName];

                if (build.upgradeStartedAt) {
                    continue;
                }

                let currentTime = new Date().getTime();
                let maxWorkHoursWithoutCollection = buildTemplate.maxWorkHoursWithoutCollection;

                if (build.lastCollectAt && (build.lastCollectAt + maxWorkHoursWithoutCollection) < currentTime) {
                    continue;
                }

                if (!build.lastCollectAt) {
                    build.lastCollectAt = currentTime;
                }

                if (build.currentLvl === 1) {
                    build.resourceCollected += buildTemplate.productionPerHour;
                }

                build.resourceCollected += buildTemplate.productionPerHour * calculateIncreaseInResourceExtraction(buildName, build.currentLvl);
            }
        }
    }
}