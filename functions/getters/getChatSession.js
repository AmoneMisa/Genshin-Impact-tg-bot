import { sessions } from '../../data.js';

export default function (chatId) {
    if (!sessions[chatId]) {
        sessions[chatId] = {
            game: {
                points: {},
                elements: {}
            }
        };
    }

    if (!sessions[chatId].hasOwnProperty("game")) {
        sessions[chatId].game = {points: {}, elements: {}};
    }

    if (!sessions[chatId].hasOwnProperty("bossSettings")) {
        sessions[chatId].bossSettings = {showDamageMessage: 1, showHealMessage: 1};
    }

    return sessions[chatId];
};