const splitRemainTime = require('./splitRemainTime');

module.exports = function (remain) {
    let [hours, minutes, seconds] = splitRemainTime(remain);

    if (remain > 0) {
        if (hours > 0) {
            return `${hours} ч ${minutes} мин ${seconds} сек`;
        } else if (minutes > 0) {
            return `${minutes} мин ${seconds} сек`;
        } else {
            return `${seconds} сек`;
        }
    } else {
        return `0 сек`;
    }
};