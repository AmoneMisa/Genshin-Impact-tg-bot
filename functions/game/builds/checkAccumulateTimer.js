import Chat from '../../../db/models/Chat.js';
import buildsTemplate from '../../../template/buildsTemplate.js';
import calculateIncreaseInResourceExtraction from './calculateIncreaseInResourceExtraction.js';
import settleBuildUpgrade from './settleBuildUpgrade.js';
import debugMessage from "../../tgBotFunctions/debugMessage.js";
import getUserName from "../../getters/getUserName.js";
import sendMessage from "../../tgBotFunctions/sendMessage.js";
import listChatIds from '../../getters/listChatIds.js';
import { withLock } from '../../general/chatLock.js';

/**
 * Hourly production tick of every building, and the "building finished" notices.
 *
 * Each chat is re-read and saved under its lock: the Mini App and the chat
 * handlers save the same document, and saving one that was loaded earlier
 * fails with a VersionError. Names and Telegram messages need the network, so
 * they are done after the lock is released.
 */
export default async function() {
    for (const chatId of await listChatIds()) {
        try {
            const finished = await withLock(chatId, () => tickChat(chatId));
            for (const {member, buildTemplate} of finished) {
                const username = await getUserName(member, "nickname") || member.userId;
                sendMessage(chatId, `@${username}, твоё здание "${buildTemplate.name}" успешно построено!`, {});
            }
        } catch (e) {
            console.error(e);
            debugMessage(`checkAccumulateTimer chat ${chatId}: ${e}`);
        }
    }
}

async function tickChat(chatId) {
    const chat = await Chat.findOne({chatId});
    if (!chat) return [];

    const finished = [];
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
                // This is now also settled inline on every bot read (see
                // getBuild.js) — this hourly pass is a safety net for
                // players who don't reopen the bot menu, so the "здание
                // построено" notification still fires without them asking.
                if (build.upgradeStartedAt) {
                    if (settleBuildUpgrade(build, buildName)) {
                        updated = true;
                        finished.push({member, buildTemplate});
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
    return finished;
}
