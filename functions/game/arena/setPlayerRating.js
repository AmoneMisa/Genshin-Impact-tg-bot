const {arenaRating} = require("../../../data");

module.exports =  function (userId, arenaType, chatId, points) {
    if (arenaType === "common") {
        arenaRating[arenaType][chatId][userId] += points;
    } else {
        arenaRating[arenaType][userId] += points;
    }
}