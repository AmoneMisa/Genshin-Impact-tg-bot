import skills from '../../../../template/classSkillsTemplate.js';
import {resolveClassName} from '../../classes/legacyClasses.js';

export default function (className = "noClass") {
    if (!className) {
        console.error("Не указано имя класса при передаче в функцию!");
    }

    return skills[resolveClassName(className.name || className)];
}