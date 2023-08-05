const stats = require("../../../../templates/classStatsTemplate");

module.exports = function (className) {
    if (!className) {
        className = "noClass";
        console.error("Не указано имя класса при передаче в функцию!");
    }

    return stats.find(_class => (className.name || className) === _class.name);
}