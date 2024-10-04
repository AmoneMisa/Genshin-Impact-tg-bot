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
import isMassGameAlreadyStarted from '../../../functions/game/general/isMassGameAlreadyStarted.js';

export default [[/(?:^|\s)\/point\b/, (msg, session) => {
    deleteMessage(msg.chat.id, msg.message_id);
    let chatSession = getChatSession(msg.chat.id);
    let members = getMembers(msg.chat.id);
    let userId = session.userChatData.user.id;

    if (chatSession.game.points.gameSessionIsStart) {
        if (new Date().getTime() - chatSession.game.points.gameSessionLastUpdateAt <= 2 * 60 * 1000) {
            return sendMessageWithDelete(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.", {
                ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
            }, 7 * 1000)
        }
    }

    if (isMassGameAlreadyStarted(chatSession)) {
        return sendMessageWithDelete(msg.chat.id, "Одна из игр на несколько человек уже запущена. Команду нельзя вызвать до окончания групповой игры.", {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
        }, 7 * 1000);
    }

    if (!chatSession.hasOwnProperty("game")) {
        chatSession.game = {};
    }

    if (!chatSession.game.hasOwnProperty("points")) {
        chatSession.game.points = {};
    }

    chatSession.game.points.gameSessionIsStart = true;
    chatSession.game.points.gameSessionLastUpdateAt = new Date().getTime();

    chatSession.game.points.players = {
        bot: {
            isPass: false,
            usedItems: []
        }
    };

    chatSession.game.points.usedItems = [];

    if (!chatSession.game.points.players[userId]) {
        chatSession.game.points.players[userId] = {
            bet: 0,
            usedItems: [],
            isPass: false
        };
    }

    if (!chatSession.game.points.players[userId].hasOwnProperty("usedItems")) {
        chatSession.game.points.players[userId].usedItems = [];
    }

    sendMessage(msg.chat.id, `${gameStatusMessage(chatSession, members, "points")}`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Участвовать",
                callback_data: "points_enter"
            }], [{
                text: "Покинуть игру",
                callback_data: "points_leave"
            }]]
        }
    }).then(message => chatSession.game.points.messageId = message.message_id);

    function startGame() {
        for (let playerId of Object.keys(chatSession.game.points.players)) {
            getCard(chatSession.game.points, playerId);
            getCard(chatSession.game.points, playerId);
        }

        chatSession.game.points.isStart = true;
        endGameTimer(chatSession, 20 * 1000, msg.chat.id, "points", msg.message_thread_id);

        return sendMessageWithDelete(msg.chat.id, `Игра началась. Ставки больше не принимаются.`, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
        }, 7 * 1000)
            .then(() => {
                editMessageText(pointMessage(chatSession, userId), {
                    ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
                    chat_id: msg.chat.id,
                    message_id: chatSession.game.points.messageId,
                    reply_markup: {
                        inline_keyboard: [[{
                            text: "Взять карту",
                            callback_data: "points_card"
                        }, {
                            text: "Пас",
                            callback_data: "points_pass"
                        }]]
                    }
                });
            });
    }

    function startBet() {
        chatSession.game.points.startGameTimeout = +setTimeout(() => startGame(), 25 * 1000);
        return sendMessageWithDelete(msg.chat.id, `Делайте ставки.`, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
        }, 7 * 1000)
            .then(() => {
                editMessageText(betMessage(chatSession.game.points.players, members), {
                    ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
                    chat_id: msg.chat.id,
                    message_id: chatSession.game.points.messageId,
                    reply_markup: {
                        inline_keyboard: [[{
                            text: "Ставка (+100)",
                            callback_data: "points_bet"
                        }, {
                            text: "Ставка (х2)",
                            callback_data: "points_double_bet"
                        }], [{
                            text: "Ставка (+1000)",
                            callback_data: "points_thousand_bet"
                        }, {
                            text: "Ставка (х5)",
                            callback_data: "points_xfive_bet"
                        }], [{
                            text: "Ставка (+10000)",
                            callback_data: "points_10t_bet"
                        }, {
                            text: "Ставка (x10)",
                            callback_data: "points_xten_bet"
                        }], [{
                            text: "Ставка (x20)",
                            callback_data: "points_x20_bet"
                        }, {
                            text: "Ставка (x50)",
                            callback_data: "points_x50_bet"
                        }], [{
                            text: "Всё или ничего",
                            callback_data: "points_allin_bet"
                        }]]
                    }
                });
            });
    }

    chatSession.game.points.startBetTimeout = +setTimeout(() => startBet(), 15 * 1000);
}]];