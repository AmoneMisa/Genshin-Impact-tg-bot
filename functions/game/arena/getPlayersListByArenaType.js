import getSession from '../../getters/getSession.js';
import getUserName from '../../getters/getUserName.js';
import updateRank from './updateRank.js';
import {arenaRating, sessions} from '../../../data.js';

const pageSize = 25;

export default async function (arenaType, page = 1, chatId) {
    let message = "";
    let sortedRating;
    let counter = page === 1 ? 1 : pageSize * page;

    if (arenaType === "common") {
        sortedRating = Array.from(Object.entries(arenaRating[arenaType][chatId])).sort(([playerId1, rating1], [playerId2, rating2]) => rating2 - rating1);
    } else {
        sortedRating = Array.from(Object.entries(arenaRating[arenaType])).sort(([playerId1, rating1], [playerId2, rating2]) => rating2 - rating1);
    }

    let requestedRating = sortedRating.slice(page === 1 ? 0 : page + pageSize, pageSize * page);

    for (let [userId, rating] of requestedRating) {
        let session;

        if (arenaType === "expansion") {
            let sessionsArray = Object.entries(sessions);

            for (let [_chatId, chatSession] of sessionsArray) {
                if (chatSession.members[userId]) {
                    session = await getSession(_chatId, userId);
                    break;
                }
            }
        }

        session = await getSession(chatId, userId);
        message += `${counter}. ${getUserName(session, "name")} (Рейтинг ${rating} | Ранг: ${updateRank(userId, arenaType, chatId)})\n`;
        counter++;
    }

    return message;
}