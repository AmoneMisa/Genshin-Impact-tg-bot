const {arenaRating} = require("../../../data");

module.exports = function (userId, percentileRank, isFirst, arenaType) {
    const user = arenaRating[arenaType][userId];

    if (isFirst) {
        user.rank = 'Ruby 1';
    } else if (user.rating >= 1520 && percentileRank <= 0.05) {
        user.rank = 'Diamond 3';
    } else if (user.rating >= 1520 && percentileRank <= 0.07) {
        user.rank = 'Diamond 2';
    } else if (user.rating >= 1500 && percentileRank <= 0.10) {
        user.rank = 'Diamond 1';
    } else if (user.rating >= 1420 && percentileRank <= 0.15) {
        user.rank = 'Gold 3';
    } else if (user.rating >= 1420 && percentileRank <= 0.20) {
        user.rank = 'Gold 2';
    } else if (user.rating >= 1420 && percentileRank <= 0.25) {
        user.rank = 'Gold 1';
    } else if (user.rating >= 1381 && user.rating <= 1420) {
        user.rank = 'Silver 3';
    } else if (user.rating >= 1351 && user.rating <= 1380) {
        user.rank = 'Silver 2';
    } else if (user.rating >= 1301 && user.rating <= 1350) {
        user.rank = 'Silver 1';
    } else if (user.rating >= 1251 && user.rating <= 1300) {
        user.rank = 'Bronze 3';
    } else if (user.rating >= 1151 && user.rating <= 1250) {
        user.rank = 'Bronze 2';
    } else if (user.rating >= 1000 && user.rating <= 1150) {
        user.rank = 'Bronze 1';
    }
}




