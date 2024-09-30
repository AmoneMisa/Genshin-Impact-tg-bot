import skills from '../../../../template/classSkillsTemplate.js';

export default function (className = "noClass") {
    if (!className) {
        console.error("Не указано имя класса при передаче в функцию!");
    }

    return skills[className.name || className];
}