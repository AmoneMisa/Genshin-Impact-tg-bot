import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import sleep from "../../../functions/tgBotFunctions/sleep.js";
import betKeyboard from "../../../functions/game/general/betKeyboard.js";
import loadPlayer from "../../../functions/getters/loadPlayer.js";

export default [[/(?:^|\s)\/dice\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let { chat, member } = await loadPlayer(msg.chat.id, session.userId);
    if (!member) {
        return;
    }

    if (!member.game.dice) {
        member.game.dice = {
            bet: 0,
            dice: 0,
            counter: 0,
            isStart: false
        };
    }

    if (member.game.dice.isStart) {
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
                inline_keyboard: betKeyboard("dice")
            }
        }
    );
    
    await sleep(20000);

    ({ chat, member } = await loadPlayer(msg.chat.id, session.userId));
    if (!member || !member.game.dice) {
        return;
    }

    member.game.dice.isStart = true;
    await chat.save();

    await editMessageText(
        `@${await getUserName(session, "nickname")}, кидай кубик. Ты выиграешь, если суммарное количество очков за 3 броска будет больше 12, но меньше 18`,
        {
            ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
            chat_id: msg.chat.id,
            message_id: message.message_id,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{ text: "Кинуть кубик", callback_data: "dice_pull" }]]
            }
        }
    );
}]];
