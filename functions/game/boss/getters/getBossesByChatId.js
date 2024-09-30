import { bosses } from '../../../../data.js';

export default function (chatId) {
    if (!bosses[chatId]) {
        bosses[chatId] = [];
    }

    return bosses[chatId];
}