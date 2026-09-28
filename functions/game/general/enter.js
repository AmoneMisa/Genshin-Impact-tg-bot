import Chat from "../../../db/models/Chat.js";
import getMembers from "../../getters/getMembers.js";
import gameStatusMessage from "./gameStatusMessage.js";
import editMessageText from "../../tgBotFunctions/editMessageText.js";

/**
 * Добавляет игрока в игру
 * @param {Object} callback - объект колбэка Telegram
 * @param {string} gameName - название игры
 */
export default async function(callback, gameName) {
    const chatId = callback.message.chat.id;
    const userId = callback.from.id;

    const chat = await Chat.findOne({ chatId });
    if (!chat || !chat.game[gameName]) return;

    const players = chat.game[gameName].players || {};
    let player = players[userId];

    if (!player) {
        if (gameName === "points") {
            players[userId] = {
                bet: 0,
                usedItems: [],
                isPass: false,
            };
        } else if (gameName === "elements") {
            players[userId] = {
                bet: 0,
                usedItems: [],
                points: 0,
                id: userId,
            };
        }
    } else {
        return; // игрок уже есть
    }

    chat.game[gameName].players = players;
    await chat.save();

    const members = await getMembers(chatId);

    return editMessageText(`${await gameStatusMessage(chat, members, gameName)}`, {
        ...(callback.message.message_thread_id
            ? { message_thread_id: callback.message.message_thread_id }
            : {}),
        chat_id: chatId,
        message_id: chat.game[gameName].messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Участвовать", callback_data: `${gameName}_enter` },
                ],
                [
                    { text: "Покинуть игру", callback_data: `${gameName}_leave` },
                ],
            ],
        },
    });
}
