import Titles from "../../../db/models/Titles.js";
import sendMessage from "../../../functions/tgBotFunctions/sendMessage.js";
import titlesMessage from "../../../functions/game/titles/titlesMessage.js";
import buttonsDictionary from "../../../dictionaries/buttons.js";
import deleteMessage from "../../../functions/tgBotFunctions/deleteMessage.js";

export default [[/(?:^|\s)\/titles/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const chatTitles = await Titles.findOne({ chatId: msg.chat.id });

    const messageText = chatTitles && chatTitles.list?.length
        ? titlesMessage(chatTitles.list)
        : "Нет доступных титулов.";

    await sendMessage(msg.chat.id, messageText, {
        ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];
