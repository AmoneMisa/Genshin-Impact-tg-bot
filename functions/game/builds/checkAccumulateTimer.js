import {sessions} from '../../../data.js';
import getMembers from '../../getters/getMembers.js';
import getBuildsList from './getBuildList.js';
import buildsTemplate from '../../../template/buildsTemplate.js';
import calculateIncreaseInResourceExtraction from './calculateIncreaseInResourceExtraction.js';
import debugMessage from "../../tgBotFunctions/debugMessage.js";
import getSession from "../../getters/getSession.js";

let i = 0;
export default async function () {
    for (let chatId of Object.keys(sessions)) {
        for (let userId of Object.keys(getMembers(chatId))) {
            let session;

            i++;
            try {
                session = await getSession(chatId, userId);
            } catch (e) {
                console.error(e);
                continue;
            }

            if (session.userChatData.user.is_bot) {
                continue;
            }

            if (session.userChatData.status === "left") {
                continue;
            }

            try {
                for (let [buildName, build] of Object.entries(await getBuildsList(chatId, userId))) {
                    let buildTemplate = buildsTemplate[buildName];
                    console.log(await getBuildsList(chatId, userId), buildTemplate);

                    if (buildName === "palace") {
                        continue;
                    }

                    if (build.upgradeStartedAt) {
                        if (userId.includes("808820899")) {
                            console.log(build.upgradeStartedAt);
                        }
                        continue;
                    }

                    let currentTime = new Date().getTime();
                    let maxWorkHoursWithoutCollection = buildTemplate.maxWorkHoursWithoutCollection;

                    if (build.lastCollectAt && (build.lastCollectAt + (maxWorkHoursWithoutCollection * 60 * 60 * 1000)) < currentTime) {
                        if (userId.includes("808820899")) {
                            console.log(build, buildName);
                        }
                        continue;
                    }

                    if (!build.lastCollectAt) {
                        if (userId.includes("808820899")) {
                            console.log(build, buildName);
                        }
                        build.lastCollectAt = currentTime;
                    }

                    if (userId.includes("808820899")) {
                        console.log(build, buildName);
                    }

                    if (build.currentLvl === 1) {
                        build.resourceCollected += Math.ceil(buildTemplate.productionPerHour);
                    } else {
                        if (userId.includes("808820899")) {
                            console.log(build, buildName);
                        }
                        build.resourceCollected += Math.ceil(buildTemplate.productionPerHour * calculateIncreaseInResourceExtraction(buildName, build.currentLvl));
                    }
                }
            } catch (e) {
                console.error(e);
                debugMessage(`buildList getting error: ${e}`);
            }
        }
    }
}