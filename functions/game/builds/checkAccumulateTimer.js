import { sessions } from '../../../data.js';
import getMembers from '../../getters/getMembers.js';
import getBuildsList from './getBuildList.js';
import buildsTemplate from '../../../template/buildsTemplate.js';
import calculateIncreaseInResourceExtraction from './calculateIncreaseInResourceExtraction.js';
import debugMessage from "../../tgBotFunctions/debugMessage.js";
import getSession from "../../getters/getSession.js";

export default async function () {
    for (let chatId of Object.keys(sessions)) {
        for (let userId of Object.keys(getMembers(chatId))) {
            let session;

            try {
                session = await getSession(chatId, userId);
            } catch (e) {
                console.error(e);
                continue;
            }
            console.log(1, chatId, userId, session.userChatData);

            if (session.userChatData.user.is_bot) {
                continue;
            }
            console.log(3);

            if (session.userChatData.status === "left") {
                continue;
            }

            try {
                for (let [buildName, build] of Object.entries(await getBuildsList(chatId, userId))) {
                    console.log(4);

                    let buildTemplate = buildsTemplate[buildName];

                    if (buildName === "palace") {
                        continue;
                    }
                    console.log(5);

                    if (build.upgradeStartedAt) {
                        continue;
                    }

                    console.log(6);

                    let currentTime = new Date().getTime();
                    let maxWorkHoursWithoutCollection = buildTemplate.maxWorkHoursWithoutCollection;

                    if (build.lastCollectAt && (build.lastCollectAt + (maxWorkHoursWithoutCollection * 60 * 60 * 1000)) < currentTime) {
                        continue;
                    }

                    console.log(7);

                    if (!build.lastCollectAt) {
                        build.lastCollectAt = currentTime;
                    }

                    console.log(8, build.lastCollectAt, build.resourceCollected);

                    if (build.currentLvl === 1) {
                        build.resourceCollected += Math.ceil(buildTemplate.productionPerHour);
                    } else {
                        build.resourceCollected += Math.ceil(buildTemplate.productionPerHour * calculateIncreaseInResourceExtraction(buildName, build.currentLvl));
                    }
                    console.log(9, build.resourceCollected);

                    debugMessage(`Ресурсы накоплены: ${build.resourceCollected}, ${buildName}, ${build.currentLvl}, ${session.userChatData.user.name}`);
                }
            } catch (e) {
                console.error(e);
                debugMessage(`buildList getting error: ${e}`);
            }
        }
    }
}