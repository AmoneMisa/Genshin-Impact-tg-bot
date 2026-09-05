import Chat from "../../../db/models/Chat.js";
import getSession from "../../getters/getSession.js";
import getUserName from "../../getters/getUserName.js";
import updateRank from "./updateRank.js";
import { getArenaRatingTable } from "./ratingStore.js";

const pageSize = 25;

async function resolveExpansionChat(userId, preferredChatId) {
    if (preferredChatId != null) {
        const chat = await Chat.findOne({chatId: Number(preferredChatId), 'members.userId': Number(userId)});
        if (chat) return chat.chatId;
    }
    const chat = await Chat.findOne({'members.userId': Number(userId)}).sort({updatedAt: -1});
    return chat?.chatId ?? null;
}

/**
 * Формирует таблицу рейтинга арены.
 */
export default async function(arenaType, page = 1, chatId) {
    const rows = await getArenaRatingTable(arenaType, chatId);
    const start = Math.max(0, (Number(page) - 1) * pageSize);
    const requested = rows.slice(start, start + pageSize);
    let counter = start + 1;
    let message = "";

    for (const row of requested) {
        const sourceChatId = arenaType === 'common'
            ? chatId
            : await resolveExpansionChat(row.userId, row.chatId);
        if (sourceChatId == null) continue;

        try {
            await getSession(sourceChatId, row.userId);
            const name = await getUserName(row.userId, "name");
            const rank = await updateRank(row.userId, arenaType, sourceChatId);
            message += `${counter}. ${name || row.userId} (Рейтинг ${row.rating} | Ранг: ${rank})\n`;
            counter++;
        } catch {
            // Пропускаем устаревшую рейтинговую запись без живой сессии.
        }
    }

    return message;
}
