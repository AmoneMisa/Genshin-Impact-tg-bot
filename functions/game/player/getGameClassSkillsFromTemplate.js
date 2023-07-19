const skills = require("../../../templates/classSkillsTemplate");

module.exports = function (className) {
    if (!className) {
        throw new Error("Не указано имя класса при передаче в функцию!");
    }

    return skills[className.name || className];
}