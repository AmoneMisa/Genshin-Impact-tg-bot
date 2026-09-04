import getDefenderDataString from "./getDefenderDataString.js";
import getArenaBots from "./getArenaBots.js";
import getSession from "../../getters/getSession.js";
import generateArenaBot from "./generateArenaBot.js";
import ArenaTempBot from "../../../db/models/ArenaTempBot.js";
import Chat from "../../../db/models/Chat.js";
import { getArenaRatingSnapshot, getArenaRatingTable } from "./ratingStore.js";
import lodash from "lodash";

const maxDefenders = 6;
const maxRatingDifference = 0.15; // 15%

async function resolveExpansionChat(userId, preferredChatId) {
    if (preferredChatId != null) {
        const chat = await Chat.findOne({chatId: Number(preferredChatId), 'members.userId': Number(userId)});
        if (chat) return chat.chatId;
    }

    const chat = await Chat.findOne({'members.userId': Number(userId)}).sort({updatedAt: -1});
    return chat?.chatId ?? null;
}

export default async function(arenaType, chatId, userId) {
    const { rating: attackerRating } = await getArenaRatingSnapshot(userId, arenaType, chatId);
    const ratingRows = await getArenaRatingTable(arenaType, chatId);
    const candidates = lodash.shuffle(ratingRows.filter(row => {
        if (String(row.userId) === String(userId)) return false;
        const rating = Number(row.rating) || 1000;
        return Math.abs(rating - attackerRating) / Math.max(1, attackerRating) <= maxRatingDifference;
    }));

    const showedPlayers = [];
    let message = "";

    for (const row of candidates) {
        if (showedPlayers.length >= maxDefenders) break;
        const sourceChatId = arenaType === 'common'
            ? chatId
            : await resolveExpansionChat(row.userId, row.chatId);
        if (sourceChatId == null) continue;

        try {
            const session = await getSession(sourceChatId, row.userId);
            message += `${await getDefenderDataString(session)}\nРейтинг: ${row.rating}\n\n`;
            showedPlayers.push(session);
        } catch {
            // Старые рейтинговые записи без живой сессии просто пропускаем.
        }
    }

    let arenaBots = await getArenaBots(attackerRating);
    while (arenaBots.length < maxDefenders - showedPlayers.length) {
        const generated = generateArenaBot(attackerRating);
        const created = await ArenaTempBot.create(generated);
        arenaBots.push(created);
    }

    for (const arenaBot of lodash.shuffle(arenaBots)) {
        if (showedPlayers.length >= maxDefenders) break;
        message += `${await getDefenderDataString(arenaBot, true)}\nРейтинг: ${arenaBot.rating}\n\n`;
        showedPlayers.push(arenaBot);
    }

    return [message, showedPlayers];
}
