import Chat from "../../../db/models/Chat.js";
import validateGameSession from "./validateGameSession.js";
import endGameTimer from "./endGameTimer.js";
import checkAllPlayersPassed from "./checkAllPlayersPassed.js";
import endGame from "./endGame.js";
import sendMessage from "../../tgBotFunctions/sendMessage.js";
import getUserName from "../../getters/getUserName.js";
import deleteMessageTimeout from "../../tgBotFunctions/deleteMessageTimeout.js";

/**
 * Игрок пасует (отказывается от дальнейших действий в игре)
 */
export default async function(callback, gameName) {
    const chatId = callback.message.chat.id;
    const userId = callback.from.id;

    const chat = await Chat.findOne({ chatId });
    if (!chat || !chat.game[gameName]) return;

    if (!validateGameSession(chat.game[gameName], userId, gameName)) return;

    endGameTimer(chat, 20 * 1000, chatId, gameName, callback.message.message_thread_id);

    const players = chat.game[gameName].players;
    const player = players[userId];
    if (!player) return;

    player.isPass = true;
    await chat.save();

    if (checkAllPlayersPassed(chat, gameName)) {
        await endGame(chatId, callback.message.message_id, true, gameName);
        return;
    }

    const username = await getUserName(userId, "nickname") || userId;
    const message = await sendMessage(
        chatId,
        `@${username}, ты спасовал. Больше что-либо делать в течении игры нельзя.`,
        {
            ...(callback.message.message_thread_id
                ? { message_thread_id: callback.message.message_thread_id }
                : {}),
        }
    );
    deleteMessageTimeout(chatId, message.message_id, 7000);
}
