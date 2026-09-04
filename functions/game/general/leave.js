import Chat from "../../../db/models/Chat.js";
import getMembers from "../../getters/getMembers.js";
import gameStatusMessage from "./gameStatusMessage.js";
import editMessageText from "../../tgBotFunctions/editMessageText.js";

/**
 * Удаляет игрока из игры
 * @param {Object} callback - объект колбэка Telegram
 * @param {string} gameName - название игры
 */
export default async function(callback, gameName) {
    const chatId = callback.message.chat.id;
    const userId = callback.from.id;

    const chat = await Chat.findOne({ chatId });
    if (!chat || !chat.game[gameName]) return;

    if (!chat.game[gameName].players) {
        chat.game[gameName].players = {};
        return;
    }

    const players = chat.game[gameName].players;
    const player = players[userId];

    if (player) {
        delete players[userId];
    } else {
        return; // игрока нет в списке
    }

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
