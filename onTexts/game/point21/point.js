const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const getChatSession = require('../../../functions/getChatSession');
const getMembers = require('../../../functions/getMembers');
const pointMessage = require('../../../functions/game/point21/pointMessage');
const betMessage = require('../../../functions/game/point21/betMessage');
const gameStatusMessage = require('../../../functions/game/point21/gameStatusMessage');
const getCard = require('../../../functions/game/point21/getCard');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const debugMessage = require('../../../functions/debugMessage');

module.exports = [[/(?:^|\s)\/point\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let chatSession = getChatSession(msg.chat.id);
        let members = getMembers(msg.chat.id);
        let userId = session.userChatData.user.id;
        let id;

        if (chatSession.pointGameSessionIsStart) {
            if (new Date().getTime() - chatSession.pointGameSessionLastUpdateAt <= 2 * 60 * 1000) {
                return sendMessage(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.")
                    .then(message => {
                        deleteMessageTimeout(msg.chat.id, message.message_id, 7000);
                    });
            }
        }

        chatSession.pointGameSessionIsStart = true;
        chatSession.pointGameSessionLastUpdateAt = new Date().getTime();

        chatSession.pointPlayers = {
            bot: {
                isPass: false,
                cards: []
            }
        };

        chatSession.pointUsedCards = [];

        if (!chatSession.pointPlayers[userId]) {
            chatSession.pointPlayers[userId] = {
                bet: 0,
                cards: [],
                isPass: false
            };
        }

        sendMessage(msg.chat.id, `${gameStatusMessage(chatSession, members)}`, {
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
        }).then(message => chatSession.pointMessageId = message.message_id);

        function startGame() {
            for (let playerId of Object.keys(chatSession.pointPlayers)) {
                getCard(chatSession, playerId);
                getCard(chatSession, playerId);
            }

            chatSession.pointIsStart = true;

            return sendMessage(msg.chat.id, `Игра началась. Ставки больше не принимаются.`)
                .then(message => {
                    deleteMessageTimeout(msg.chat.id, message.message_id, 7000);
                }).then(() => {
                    bot.editMessageText(pointMessage(chatSession, userId), {
                        chat_id: msg.chat.id,
                        message_id: chatSession.pointMessageId,
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
            setTimeout(() => startGame(), 25 * 1000);
            return sendMessage(msg.chat.id, `Делайте ставки.`)
                .then(message => {
                    deleteMessageTimeout(msg.chat.id, message.message_id, 7000);
                }).then(() => {
                    bot.editMessageText(betMessage(chatSession, members), {
                        chat_id: msg.chat.id,
                        message_id: chatSession.pointMessageId,
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
                            },{
                                text: "Ставка (x10)",
                                callback_data: "points_xten_bet"
                            }],[{
                                text: "Всё или ничего",
                                callback_data: "points_allin_bet"
                            }]]
                        }
                    });
                });
        }

        setTimeout(() => startBet(), 15 * 1000);
    } catch (e) {
        debugMessage(`Command: /point\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];