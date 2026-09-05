import Chat from "../../db/models/Chat.js";
import buildsTemplate from "../../template/buildsTemplate.js";

/**
 * Проверяет постройки игроков и обновляет статус сбора ресурсов
 */
export default async function updateBuildsCollection() {
    const chats = await Chat.find({});
    const now = Date.now();

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const builds = member.game?.builds || [];
            for (const build of builds) {
                const buildTemplate = buildsTemplate[build.name];
                if (!buildTemplate) continue;

                if (!build.lastCollectAt) {
                    build.lastCollectAt = now;
                }

                const elapsed = now - build.lastCollectAt;
                const maxAllowed = buildTemplate.maxWorkHoursWithoutCollection * 60 * 60 * 1000;

                if (elapsed > maxAllowed) {
                    build.isCollectedResources = false;
                } else {
                    build.isCollectedResources = true;
                    build.lastCollectAt = now; // ⚠️ можно убрать, если нужно хранить именно момент последнего сбора игроком
                }

                updated = true;
            }
        }

        if (updated) {
            await chat.save();
        }
    }
}
