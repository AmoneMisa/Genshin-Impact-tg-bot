import Chat from "../../../db/models/Chat.js";
import getCard from "./getCard.js";
import getPoints from "./getPoints.js";

/**
 * Логика принятия решений ботом в игре 21
 * @param {string} chatId - идентификатор чата
 */
export default async function(chatId) {
    const chat = await Chat.findOne({ chatId });
    if (!chat || !chat.game.points) return;

    const players = Object.entries(chat.game.points.players)
        .filter(([playerId]) => playerId !== "bot")
        .map(([, player]) => player);

    const playerPoints = players
        .map(player => getPoints(player))
        .filter(p => p <= 21);

    const maxPoints = playerPoints.length ? Math.max(...playerPoints) : 0;

    const bot = chat.game.points.players["bot"];
    if (!bot) return;

    let botPoints = getPoints(bot);

    // Бот берёт карты, пока не достигнет условий выхода
    while (botPoints < 21 && botPoints <= maxPoints) {
        getCard(chat.game.points, "bot");
        botPoints = getPoints(bot);
    }

    bot.isPass = true;

    await chat.save();
}
