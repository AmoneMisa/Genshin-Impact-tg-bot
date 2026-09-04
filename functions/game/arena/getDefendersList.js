import getDefenderDataString from "./getDefenderDataString.js";
import ArenaRating from "../../../db/models/ArenaRating.js";
import getPlayerRating from "./getPlayerRating.js";
import getArenaBots from "./getArenaBots.js";
import generateArenaBots from "../../shedullers/generateArenaBots.js";
import getSession from "../../getters/getSession.js";
import lodash from "lodash";

const maxDefenders = 6;
const maxRatingDifference = 0.15; // 15%

export default async function(arenaType, chatId, userId) {
    let message = "";

    // 1. Получаем рейтинг атакующего
    const [attackerRating] = await getPlayerRating(userId, arenaType, chatId);

    // 2. Получаем список игроков из базы
    let ratings;
    if (arenaType === "common") {
        ratings = await ArenaRating.find({ chatId, mode: "common" });
    } else {
        ratings = await ArenaRating.find({ mode: "expansion" });
    }

    // 3. Получаем ботов
    let arenaBots = await getArenaBots(attackerRating);
    if (!arenaBots.length) {
        await generateArenaBots();
        arenaBots = await getArenaBots(attackerRating);
    }

    // 4. Формируем список игроков + боты
    let playersList = ratings.map(r => r.userId).concat(arenaBots);

    // 5. Перемешиваем
    playersList = lodash.shuffle(playersList);

    // 6. Выбираем защитников
    let showedPlayers = [];
    let countDefenders = 0;

    for (let player of playersList) {
        if (countDefenders >= maxDefenders) break;

        if (lodash.isObject(player)) {
            // бот
            message += `${await getDefenderDataString(player, true)}\nРейтинг: ${player.rating}\n\n`;
        } else {
            // живой игрок
            if (parseInt(player) === parseInt(userId)) continue;

            const [playerRating] = await getPlayerRating(player, arenaType, chatId);
            const percentileDiffRating = attackerRating / playerRating;

            if (percentileDiffRating > maxRatingDifference) continue;

            const session = await getSession(chatId, player);
            message += `${await getDefenderDataString(session)}\nРейтинг: ${playerRating}\n\n`;
            showedPlayers.push(session);
            countDefenders++;
            continue;
        }

        showedPlayers.push(player);
        countDefenders++;
    }

    return [message, showedPlayers];
}
