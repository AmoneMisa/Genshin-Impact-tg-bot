import Chat from "../../db/models/Chat.js";
import bot from "../../bot.js";
import listChatIds from "../getters/listChatIds.js";
import { withLock } from "../general/chatLock.js";

/**
 * Обновляет статус участников (isHided) в базе,
 * если они покинули чат, были кикнуты или забанены.
 *
 * Статусы запрашиваются у Telegram заранее (это долго), а в чат записываются
 * потом, под локом чата и на свежем документе, чтобы не получить VersionError.
 */
export default async function() {
    for (const chatId of await listChatIds()) {
        const snapshot = await Chat.findOne({chatId}, {members: 1}).lean();
        if (!snapshot) continue;

        const hidden = new Map();
        for (const member of snapshot.members) {
            try {
                const chatMember = await bot.getChatMember(chatId, parseInt(member.userId));
                const status = chatMember.status;
                hidden.set(String(member.userId), status === "left" || status === "kicked" || status === "banned");
            } catch (err) {
                // Если не удалось получить статус — считаем, что игрок скрыт
                hidden.set(String(member.userId), true);
            }
        }

        await withLock(chatId, async () => {
            const chat = await Chat.findOne({chatId});
            if (!chat) return;
            let updated = false;

            for (const member of chat.members) {
                const shouldHide = hidden.get(String(member.userId));
                if (shouldHide !== undefined && member.isHided !== shouldHide) {
                    member.isHided = shouldHide;
                    updated = true;
                }
            }

            if (updated) {
                await chat.save();
            }
        });
    }
}
