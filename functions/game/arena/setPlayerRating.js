const {arenaRating} = require("../../../data");

module.exports =  function (userId, arenaType, chatId, points) {
    if (arenaType === "common") {
        arenaRating[arenaType][chatId][userId].rating += points;
    } else {
        arenaRating[arenaType][userId].rating += points;
    }
}