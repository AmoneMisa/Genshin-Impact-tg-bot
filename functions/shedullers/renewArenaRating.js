const {arenaRating} = require("../../data");

module.exports = function () {
    for (let ratingKey of Object.keys(arenaRating.expansion)) {
        arenaRating.expansion[ratingKey] = 1000;
    }

    for (let chatRating of Object.values(arenaRating.common)) {
        for (let ratingKey of Object.keys(chatRating)) {
            chatRating[ratingKey] = 1000;
        }
    }
}