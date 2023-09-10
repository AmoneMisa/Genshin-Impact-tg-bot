const getDefenderDataString = require("./getDefenderDataString");
const {arenaRating} = require("../../../data");
const getPlayerRating = require("./getPlayerRating");
const generateArenaBot = require("./generateArenaBot");
const getSession = require("../../getters/getSession");

const maxDefenders = 5;
const maxRatingDifference = 0.1; // 10%

module.exports = async function (arenaType, chatId, userId) {
    let message = "";
    let playersList = arenaType === "common" ? arenaRating[arenaType][chatId] : arenaRating[arenaType];
    let [attackerRating] = getPlayerRating(userId, arenaType, chatId);
    let countDefenders = 0;

    for (let id of Object.keys(playersList)) {
        if (countDefenders >= maxDefenders) {
            break;
        }

        if (parseInt(id) === parseInt(userId)) {
            continue;
        }

        let [playerRating, percentileRating] = getPlayerRating(id, arenaType, chatId);

        if (percentileRating > maxRatingDifference) {
            continue;
        }

        let session = await getSession(chatId, id);
        message += `${getDefenderDataString(session)}\nРейтинг: ${playerRating}\n\n`;

        countDefenders++;
    }

    let arenaBots = [];
    if (countDefenders < maxDefenders) {
        let neededBotsCount = maxDefenders - countDefenders;

        for (let i = 0; i < neededBotsCount; i++) {
            let arenaBot = generateArenaBot(attackerRating);
            arenaBots.push(arenaBot);

            message += `${getDefenderDataString(arenaBot, true)}\nРейтинг: ${arenaBot.ratingKey}\n\n`;
        }
    }

    return [message, arenaBots];
}