import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getChatSession from '../../../functions/getters/getChatSession.js';
import getMembers from '../../../functions/getters/getMembers.js';
import pointMessage from '../../../functions/game/point21/pointMessage.js';
import betMessage from '../../../functions/game/general/betMessage.js';
import gameStatusMessage from '../../../functions/game/general/gameStatusMessage.js';
import getCard from '../../../functions/game/point21/getCard.js';
import endGameTimer from '../../../functions/game/general/endGameTimer.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sleep from "../../../functions/tgBotFunctions/sleep.js";
import betKeyboard from "../../../functions/game/general/betKeyboard.js";
import isMassGameAlreadyStarted from "../../../functions/game/general/isMassGameAlreadyStarted.js";

export default [[/(?:^|\s)\/point\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const chatSession = await getChatSession(msg.chat.id);
    const members = await getMembers(msg.chat.id);
    const userId = session.userId;

    console.log(chatSession)
    if (chatSession.game.points?.gameSessionIsStart) {
        if (Date.now() - chatSession.game.points.gameSessionLastUpdateAt <= 2 * 60 * 1000) {
            return sendMessageWithDelete(
                msg.chat.id,
                "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.",
                { ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}) },
                7000
            );
        }
    }

    if (isMassGameAlreadyStarted(chatSession)) {
        return sendMessageWithDelete(
            msg.chat.id,
            "Одна из игр на несколько человек уже запущена. Команду нельзя вызвать до окончания групповой игры.",
            { ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}) },
            7000
        );
    }

    chatSession.game = chatSession.game || {};
    chatSession.game.points = chatSession.game.points || {};

    chatSession.game.points.gameSessionIsStart = true;
    chatSession.game.points.gameSessionLastUpdateAt = Date.now();
    chatSession.game.points.players = {
        bot: { isPass: false, usedItems: [] }
    };
    chatSession.game.points.usedItems = [];

    if (!chatSession.game.points.players[userId]) {
        chatSession.game.points.players[userId] = {
            bet: 0,
            usedItems: [],
            isPass: false
        };
    }

    const message = await sendMessage(
        msg.chat.id,
        gameStatusMessage(chatSession, members, "points"),
        {
            ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Участвовать", callback_data: "points_enter" }],
                    [{ text: "Покинуть игру", callback_data: "points_leave" }]
                ]
            }
        }
    );

    chatSession.game.points.messageId = message.message_id;
    await chatSession.save();

    await sendMessageWithDelete(msg.chat.id, "Делайте ставки.", {
        ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {})
    }, 7000);

    await editMessageText(betMessage(chatSession.game.points.players, members), {
        ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
        chat_id: msg.chat.id,
        message_id: chatSession.game.points.messageId,
        reply_markup: {
            inline_keyboard: betKeyboard("points")
        }
    });

    await sleep(25000);

    for (const playerId of Object.keys(chatSession.game.points.players)) {
        getCard(chatSession.game.points, playerId);
        getCard(chatSession.game.points, playerId);
    }

    chatSession.game.points.isStart = true;
    await chatSession.save();

    endGameTimer(chatSession, 20000, msg.chat.id, "points", msg.message_thread_id);

    await sendMessageWithDelete(msg.chat.id, "Игра началась. Ставки больше не принимаются.", {
        ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {})
    }, 7000);

    await editMessageText(pointMessage(chatSession), {
        ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
        chat_id: msg.chat.id,
        message_id: chatSession.game.points.messageId,
        reply_markup: {
            inline_keyboard: [
                [{ text: "Взять карту", callback_data: "points_card" },
                    { text: "Пас", callback_data: "points_pass" }]
            ]
        }
    });
}]];
