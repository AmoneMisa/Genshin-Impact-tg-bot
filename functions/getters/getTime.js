import splitRemainTime from './splitRemainTime.js';

/**
 * Считает оставшееся время в мс, часах, минутах, секундах
 * @param datetime
 * @returns {(number|number)[]}
 */
export default function (datetime) {
    let remain = (datetime || 0) - new Date().getTime();

    return [remain, ...splitRemainTime(remain)];
};