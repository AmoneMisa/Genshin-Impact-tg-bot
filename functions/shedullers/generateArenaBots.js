import ArenaTempBot from "../../db/models/ArenaTempBot.js";
import ArenaRating from "../../db/models/ArenaRating.js";
import generateArenaBot from "../game/arena/generateArenaBot.js";

/**
 * Генерация временных арен-ботов и сохранение их в MongoDB
 */
export default async function generateArenaTempBots() {
    // Загружаем конфигурацию рейтингов из базы
    const ratings = await ArenaRating.find({});
    const bots = [];

    for (const { rating, count } of ratings) {
        for (let i = 0; i < count; i++) {
            const bot = generateArenaBot(rating);
            bots.push(bot);
        }
    }

    // Очищаем старых ботов
    await ArenaTempBot.deleteMany({});

    // Сохраняем новых
    await ArenaTempBot.insertMany(bots);

    return bots;
}
