import { sessions } from '../../../data.js';
import getMembers from '../../getters/getMembers.js';
import getBuildsList from './getBuildList.js';
import buildsTemplate from '../../../template/buildsTemplate.js';
import calculateIncreaseInResourceExtraction from './calculateIncreaseInResourceExtraction.js';
import debugMessage from "../../tgBotFunctions/debugMessage.js";

export default async function () {
    for (let chatId of Object.keys(sessions)) {
        debugMessage(`checkAccumulate chatId: ${chatId}`);
        for (let userId of Object.keys(getMembers(chatId))) {
            debugMessage(`checkAccumulate userId: ${userId}`);

            for (let [buildName, build] of Object.entries(await getBuildsList(chatId, userId))) {
                let buildTemplate = buildsTemplate[buildName];
                debugMessage(`checkAccumulate build: ${JSON.stringify(build)}`);
                debugMessage(`checkAccumulate buildName: ${buildName}`);

                if (build.upgradeStartedAt) {
                    continue;
                }

                let currentTime = new Date().getTime();
                let maxWorkHoursWithoutCollection = buildTemplate.maxWorkHoursWithoutCollection;

                if (build.lastCollectAt && (build.lastCollectAt + (maxWorkHoursWithoutCollection * 60 * 60 * 1000)) < currentTime) {
                    continue;
                }

                if (!build.lastCollectAt) {
                    debugMessage(`checkAccumulate lastCollectAt - null: ${chatId}`);

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