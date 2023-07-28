const skills = require("../../../templates/classSkillsTemplate");

module.exports = function (className) {
    if (!className) {
        console.error("Не указано имя класса при передаче в функцию!");
    }

    return skills[className.name || className];
}