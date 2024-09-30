import sendMessage from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getFile from '../../../functions/getters/getFile.js';
import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';

export default [[/(?:^|\s)\/pet\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const file = getFile("images/pet", session?.pet?.type || "default");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: `${session?.pet?.name || "Чудик"} - Ваш питомец. Вы можете его кормить, ухаживать, прокачивать, изменять имя и внешний вид.`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[
                    {text: "Уход за питомцем", callback_data: `pet.care.${msg.chat.id}`},
                    {text: "Тренировка", callback_data: `pet.trainee.${msg.chat.id}`},
                ], [
                    {text: "Изменить облик", callback_data: `pet.view.${msg.chat.id}`},
                    {text: "Изменить имя", callback_data: `pet.name.${msg.chat.id}`},
                ]]
            }
        });
    } else {
        await sendMessage(msg.chat.id, `${session?.pet?.name || "Чудик"} - Ваш питомец. Вы можете его кормить, ухаживать, прокачивать, изменять имя и внешний вид.`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [

                ]
            }
        });
    }
}]];