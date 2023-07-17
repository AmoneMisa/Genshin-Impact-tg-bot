const splitRemainTime = require('./splitRemainTime');

/**
 * Считает оставшееся время в мс, часах, минутах, секундах
 * @param datetime
 * @returns {(number|number)[]}
 */
module.exports = function (datetime) {
    let remain = (datetime || 0) - new Date().getTime();

    return [remain, ...splitRemainTime(remain)];
};