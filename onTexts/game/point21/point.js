const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const getChatSession = require('../../../functions/getChatSession');
const getMembers = require('../../../functions/getMembers');
const pointMessage = require('../../../functions/game/point21/pointMessage');
const betMessage = require('../../../functions/game/point21/betMessage');
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
            return sendMessage(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.")
                .then(message => {
                deleteMessageTimeout(msg.chat.id, message.message_id, 7000);
            });
        }

        chatSession.pointGameSessionIsStart = true;

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

        sendMessage(msg.chat.id, `${betMessage(chatSession, members)}`, {
            disable_notification: true,
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
                }]]
            }
        }).then(message => id = message.message_id);

        function startGame() {
            for (let playerId of Object.keys(chatSession.pointPlayers)) {
                getCard(chatSession, playerId);
                getCard(chatSession, playerId);
            }

            chatSession.pointIsStart = true;

            return sendMessage(msg.chat.id, `Игра началась. Ставки больше не принимаются.`)
                .then(message => {
                    deleteMessageTimeout(msg.chat.id, message.message_id, 7000);
                })
                .then(() => {
                    bot.editMessageText(pointMessage(chatSession, userId), {
                        chat_id: msg.chat.id,
                        message_id: id,
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

        setTimeout(() => startGame(), 40 * 1000);
    } catch (e) {
        debugMessage(`Command: /point\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];