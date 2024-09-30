import getSession from '../../getters/getSession.js';
import {arenaRating, sessions} from "../../../data.js";

export default async function (arenaType, chatId, type = "rating") {
    let currentRating;
    let players = [];

    if (arenaType === "common") {
        currentRating = arenaRating[arenaType][chatId];
    } else {
        currentRating = arenaRating[arenaType];
    }

    if (type === "rating") {
        return currentRating;
    }

    for (let [userId, rating] of currentRating) {
        let session;

        if (arenaType === "expansion") {
            let sessionsArray = Object.entries(sessions);

            for (let [_chatId, chatSession] of sessionsArray) {
                if (chatSession.members[userId]) {
                    session = await getSession(_chatId, userId);
                    break;
                }
            }
        } else {
            session = await getSession(chatId, userId);
        }

        players.push(session);
    }

    return players;
}