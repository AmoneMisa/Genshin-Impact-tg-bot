import stats from '../../../../template/classStatsTemplate.js';
import scaleClassStats from '../scaleClassStats.js';
import {resolveClassName} from '../../classes/legacyClasses.js';

export default function (className, lvl = 1) {
    if (!className) {
        className = "noClass";
        console.error("Не указано имя класса при передаче в функцию!");
    }

    const wanted = resolveClassName(className.name || className, lvl);
    const template = stats.find(_class => wanted === _class.name);
    return scaleClassStats(template, lvl);
}
