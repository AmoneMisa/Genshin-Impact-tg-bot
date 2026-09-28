import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import sleep from "../../../functions/tgBotFunctions/sleep.js";
import betKeyboard from "../../../functions/game/general/betKeyboard.js";
import loadPlayer from "../../../functions/getters/loadPlayer.js";

export default [[/(?:^|\s)\/bowling\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let { chat, member } = await loadPlayer(msg.chat.id, session.userId);
    if (!member) {
        return;
    }

    if (!member.game.bowling) {
        member.game.bowling = {
            bet: 0,
            skittles: 0,
            counter: 0,
            isStart: false
        };
    }

    if (member.game.bowling.isStart) {
        return sendMessageWithDelete(
            msg.chat.id,
            "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.",
            { ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}) },
            7000
        );
    }

    await chat.save();

    const message = await sendMessage(
        msg.chat.id,
        `@${await getUserName(session, "nickname")}, твоя ставка: 0`,
        {
            ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
            disable_notification: true,
            reply_markup: {
                inline_keyboard: betKeyboard("bowling")
            }
        }
    );

    await sleep(20000);

    ({ chat, member } = await loadPlayer(msg.chat.id, session.userId));
    if (!member || !member.game.bowling) {
        return;
    }

    member.game.bowling.isStart = true;
    await chat.save();

    await editMessageText(
        `@${await getUserName(session, "nickname")}, делай бросок. Ты выиграешь, если суммарное количество сбитых кеглей за 2 броска будет больше 8. При двух страйках, твоя ставка утроится.`,
        {
            ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
            chat_id: msg.chat.id,
            message_id: message.message_id,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{ text: "Сделать бросок", callback_data: "bowling_pull" }]]
            }
        }
    );
}]];