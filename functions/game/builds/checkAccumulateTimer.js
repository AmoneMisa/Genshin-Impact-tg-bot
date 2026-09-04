import Chat from '../../../db/models/Chat.js';
import buildsTemplate from '../../../template/buildsTemplate.js';
import calculateIncreaseInResourceExtraction from './calculateIncreaseInResourceExtraction.js';
import calculateRemainBuildTime from './calculateRemainBuildTime.js';
import upgradeBuild from './upgradeBuild.js';
import debugMessage from "../../tgBotFunctions/debugMessage.js";
import getUserName from "../../getters/getUserName.js";
import sendMessage from "../../tgBotFunctions/sendMessage.js";

export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) {
                continue;
            }

            if (member.userChatData?.status === "left") {
                continue;
            }

            const builds = member.game?.builds;
            if (!builds) {
                continue;
            }

            try {
                for (let [buildName, build] of Object.entries(builds)) {
                    const buildTemplate = buildsTemplate[buildName];
                    if (!buildTemplate) {
                        continue;
                    }

                    // Завершаем улучшение по persisted timestamp. Это переживает
                    // перезапуск процесса и не зависит от volatile setTimeout.
                    if (build.upgradeStartedAt) {
                        let remain;
                        try {
                            remain = calculateRemainBuildTime(buildName, build);
                        } catch (e) {
                            continue;
                        }

                        if (remain <= 0) {
                            upgradeBuild(build, buildName);
                            build.upgradeStartedAt = null;
                            build.upgradeTimerId = null;
                            updated = true;

                            const username = await getUserName(member, "nickname") || member.userId;
                            sendMessage(chat.chatId, `@${username}, твоё здание "${buildTemplate.name}" успешно построено!`, {});
                        }

                        continue;
                    }

                    if (buildName === "palace" || !Number.isFinite(Number(buildTemplate.productionPerHour))) {
                        continue;
                    }

                    if (!Number.isFinite(Number(build.resourceCollected))) {
                        build.resourceCollected = 0;
                        updated = true;
                    }

                    const currentTime = Date.now();
                    const maxWorkHoursWithoutCollection = Number(buildTemplate.maxWorkHoursWithoutCollection);

                    // Если автономный лимит уже исчерпан, новые ресурсы не добавляем.
                    if (build.lastCollectAt && Number.isFinite(maxWorkHoursWithoutCollection)
                        && (Number(build.lastCollectAt) + (maxWorkHoursWithoutCollection * 60 * 60 * 1000)) < currentTime) {
                        continue;
                    }

                    if (!build.lastCollectAt) {
                        build.lastCollectAt = currentTime;
                    }

                    if (Number(build.currentLvl) === 1) {
                        build.resourceCollected += Math.ceil(Number(buildTemplate.productionPerHour));
                    } else {
                        build.resourceCollected += Math.ceil(Number(buildTemplate.productionPerHour)
                            * calculateIncreaseInResourceExtraction(buildName, Number(build.currentLvl)));
                    }

                    updated = true;
                }
            } catch (e) {
                console.error(e);
                debugMessage(`buildList getting error: ${e}`);
            }
        }

        if (updated) {
            await chat.save();
        }
    }
}
