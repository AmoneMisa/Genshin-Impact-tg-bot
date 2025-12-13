import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import sleep from "../../../functions/tgBotFunctions/sleep.js";
import betKeyboard from "../../../functions/game/general/betKeyboard.js";

export default [[/(?:^|\s)\/darts\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (!session.game.darts) {
        session.game.darts = {
            bet: 0,
            dart: 0,
            counter: 0,
            isStart: false
        };
    }

    if (session.game.darts.isStart) {
        return sendMessageWithDelete(
            msg.chat.id,
            "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.",
            { ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}) },
            7000
        );
    }

    const message = await sendMessage(
        msg.chat.id,
        `@${await getUserName(session, "nickname")}, твоя ставка: 0`,
        {
            ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
            disable_notification: true,
            reply_markup: {
                inline_keyboard: betKeyboard("darts")
            }
        }
    );

    // Жёсткая пауза 20 секунд для ставок
    await sleep(20000);

    // Автоматический старт игры
    session.game.darts.isStart = true;
    await session.save();

    await editMessageText(
        `@${await getUserName(session, "nickname")}, делай бросок. Ты выиграешь, если суммарное количество очков за 3 броска будет больше 13. При трёх "яблочках", твоя ставка удвоится.`,
        {
            chat_id: msg.chat.id,
            message_id: message.message_id,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{ text: "Сделать бросок", callback_data: "darts_pull" }]]
            }
        }
    );
}]];