import stats from '../../../../template/classStatsTemplate.js';
import scaleClassStats from '../scaleClassStats.js';

export default function (className, lvl = 1) {
    if (!className) {
        className = "noClass";
        console.error("Не указано имя класса при передаче в функцию!");
    }

    const template = stats.find(_class => (className.name || className) === _class.name);
    return scaleClassStats(template, lvl);
}
