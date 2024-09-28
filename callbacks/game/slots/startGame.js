const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');
const deleteMessage = require('../../../functions/tgBotFunctions/deleteMessage');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const getUserName = require('../../../functions/getters/getUserName');

module.exports = [
    [/^slots_start_game$/, async function (session, callback) {
        if (getUserName(session, "nickname") !== callback.from.username) {
            return;
        }

        if (!session.game.hasOwnProperty('slots')) {
            return;
        }

        if (session.game.slots.state !== 'wait_start') {
            return;
        }

        session.game.slots.state = 'spin1';
        await deleteMessage(callback.message.chat.id, callback.message.message_id);

        let spinSet = ['😈', '❤️', '💋', '🤏', '🛫', '🚗', '💩', '👻', '👽', '☠️'];
        let isWin = Math.random() < 0.2;
        let resultSpins = [];

        function isWinSpins(spins) {
            let spin = spins[0];

            for (let i = 1; i < spins.length; i++) {
                if (spins[i] !== spin) {
                    return false;
                }
            }

            return true;
        }

        if (isWin) {
            let spin = spinSet[Math.floor(spinSet.length * Math.random())];
            resultSpins.push(spin, spin, spin);
        } else {
            do {
                resultSpins = [];

                for (let i = 0; i < 3; i++) {
                    resultSpins.push(spinSet[Math.floor(spinSet.length * Math.random())]);
                }
            } while (isWinSpins(resultSpins));
        }

        let sentMessage = await sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, ${resultSpins.slice(0, 1).join('')}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        });
        setTimeout(async () => {
            if (!session.game.hasOwnProperty('slots')) {
                return;
            }

            if (session.game.slots.state !== 'spin1') {
                return;
            }

            session.game.slots.state = 'spin2';

            await editMessageText(`@${getUserName(session, "nickname")}, ${resultSpins.slice(0, 2).join('')}`, {
                chat_id: sentMessage.chat.id,
                message_id: sentMessage.message_id,
            });
            setTimeout(async () => {
                if (!session.game.hasOwnProperty('slots')) {
                    return;
                }

                if (session.game.slots.state !== 'spin2') {
                    return;
                }

                session.game.slots.state = 'end_game';
                let text;

                if (isWin) {
                    let prize = session.game.slots.bet * 1.5;
                    session.game.inventory.gold += prize;
                    text = `@${getUserName(session, "nickname")}, ${resultSpins.join('')} - ты выиграл. Выигрыш: ${prize}`;
                } else {
                    text = `@${getUserName(session, "nickname")}, ${resultSpins.join('')} - ты проиграл. Проигрыш: ${session.game.slots.bet}`;
                }

                await editMessageText(text, {
                    chat_id: sentMessage.chat.id,
                    message_id: sentMessage.message_id,
                });
                deleteMessageTimeout(sentMessage.chat.id, sentMessage.message_id, 60 * 1000);
                delete session.game.slots;
            }, 1500);
        }, 1500);
    }],
];