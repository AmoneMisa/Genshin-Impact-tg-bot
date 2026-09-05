import Chat from "../../../db/models/Chat.js";
import pointsBotThink from "../point21/botThink.js";
import findWinners from "./findWinners.js";
import endGameMessage from "./endGameMessage.js";
import setEndGameTimer from "./setEndGameTimer.js";

export default async function(chatId, messageId, isDefault = true, gameName) {
    let chat = await Chat.findOne({ chatId });
    if (!chat || !chat.game[gameName]) return;

    // Бот меняет ту же Mongo-сессию. Дожидаемся его хода и перечитываем чат,
    // иначе победители могли считаться до завершения botThink().
    if (gameName === "points") {
        await pointsBotThink(chatId);
        chat = await Chat.findOne({ chatId });
        if (!chat || !chat.game[gameName]) return;
    }

    const game = chat.game[gameName];
    const winners = findWinners(chat, gameName);

    game.isStart = false;
    game.gameSessionIsStart = false;
    game.players = {};
    game.usedItems = [];

    if (gameName === "elements") {
        chat.game.elements.currentRound = 1;
        chat.game.elements.countPresses = 0;

        if (chat.game.elements.startGameTimeout) {
            clearTimeout(chat.game.elements.startGameTimeout);
            chat.game.elements.startGameTimeout = null;
        }
        if (chat.game.elements.startBetTimeout) {
            clearTimeout(chat.game.elements.startBetTimeout);
            chat.game.elements.startBetTimeout = null;
        }
    }

    await endGameMessage(winners, chatId, messageId, isDefault, gameName);
    setEndGameTimer(chat, 0, chatId, gameName, null);
    await chat.save();
}
