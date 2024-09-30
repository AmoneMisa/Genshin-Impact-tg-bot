const skills = require("../../../../template/classSkillsTemplate");

module.exports = function (className = "noClass") {
    if (!className) {
        console.error("Не указано имя класса при передаче в функцию!");
    }

    return skills[className.name || className];
}