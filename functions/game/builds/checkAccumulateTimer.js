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
                    let buildTemplate = buildsTemplate[buildName];

                    // Завершаем улучшение, если время вышло (заменяет volatile setTimeout,
                    // который не переживал перезапуск процесса). Проверяется для всех
                    // построек, включая palace.
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

                            const username = getUserName(member, "nickname") || member.userId;
                            sendMessage(chat.chatId, `@${username}, твоё здание "${buildTemplate.name}" успешно построено!`, {});
                        }

                        continue; // ещё строится (или только что достроилось) — без накопления в этот тик
                    }

                    if (buildName === "palace") {
                        continue;
                    }

                    let currentTime = new Date().getTime();
                    let maxWorkHoursWithoutCollection = buildTemplate.maxWorkHoursWithoutCollection;

                    //если последний сбор был более maxWorkHoursWithoutCollection, то НЕ накапливаем ресурсы
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
