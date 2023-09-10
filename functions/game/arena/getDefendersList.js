const getDefenderDataString = require("./getDefenderDataString");
const {arenaRating} = require("../../../data");
const getPlayerRating = require("./getPlayerRating");
const getArenaBots = require("./getArenaBots");
const generateArenaBots = require("../../shedullers/generateArenaBots");
const getSession = require("../../getters/getSession");
const lodash = require("lodash");

const maxDefenders = 6;
const maxRatingDifference = 0.15; // 10%

module.exports = async function (arenaType, chatId, userId) {
    let message = "";
    let playersList = arenaType === "common" ? arenaRating[arenaType][chatId] : arenaRating[arenaType];
    let [attackerRating] = getPlayerRating(userId, arenaType, chatId);
    let countDefenders = 0;
    let arenaBots = getArenaBots(attackerRating);

    if (!arenaBots.length) {
        generateArenaBots();
        arenaBots = getArenaBots(attackerRating);
    }

    playersList = Array.from(Object.keys(playersList)).concat(arenaBots);
    playersList = lodash.shuffle(playersList);

    let showedPlayers = [];
    for (let player of playersList) {
        if (countDefenders >= maxDefenders) {
            break;
        }

        if (lodash.isObject(player)) {
            message += `${getDefenderDataString(player, true)}\nРейтинг: ${player.rating}\n\n`;
        } else {
            if (parseInt(player) === parseInt(userId)) {
                continue;
            }

            let [playerRating] = getPlayerRating(player, arenaType, chatId);
            let percentileDiffRating = attackerRating / playerRating;

            if (percentileDiffRating > maxRatingDifference) {
                continue;
            }

            let session = await getSession(chatId, player);
            message += `${getDefenderDataString(session)}\nРейтинг: ${playerRating}\n\n`;
        }

        showedPlayers.push(player);
        countDefenders++;
    }

    return [message, showedPlayers];
}