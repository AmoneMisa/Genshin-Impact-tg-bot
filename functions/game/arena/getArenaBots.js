const {arenaTempBots} = require("../../../data");

const maxRatingDifference = 60; // В очках

module.exports = function (rating) {
    return arenaTempBots.filter(arenaBot => {
        if (arenaBot.rating === 1000) {
            return arenaBot;
        }

        return arenaBot.rating >= rating && arenaBot.rating - rating <= Math.max(0, maxRatingDifference)
    });
}