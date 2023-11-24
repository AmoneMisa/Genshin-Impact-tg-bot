const getSession = require("../../getters/getSession");
import data from "../../../data";
const {sessions} = data;

module.exports = async function (arenaType, chatId, type = "rating") {
    let currentRating;
    let players = [];

    if (arenaType === "common") {
        currentRating = data.arenaRating[arenaType][chatId];
    } else {
        currentRating = data.arenaRating[arenaType];
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