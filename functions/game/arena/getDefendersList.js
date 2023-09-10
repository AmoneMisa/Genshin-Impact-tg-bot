const getDefenderDataString = require("./getDefenderDataString");
const {arenaRating} = require("../../../data");
const getPlayerRating = require("./getPlayerRating");
const getSession = require("../../getters/getSession");

module.exports = async function (arenaType, chatId, userId) {
    let message = "";
    let playersList = arenaType === "common" ? arenaRating[arenaType][chatId] : arenaRating[arenaType];
    for (let id of Object.keys(playersList)) {
        if (parseInt(id) === parseInt(userId)) {
            continue;
        }

        let session = await getSession(chatId, id);
        message += `${getDefenderDataString(session)}\nРейтинг: ${getPlayerRating(id, arenaType, chatId)[0]}\n\n`;
    }

    return message;
}