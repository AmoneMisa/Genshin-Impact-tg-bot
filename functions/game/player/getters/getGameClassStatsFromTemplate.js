const stats = require("../../../../templates/classStatsTemplate");

module.exports = function (className, lvl = 1) {
    if (!className) {
        className = "noClass";
        console.error("Не указано имя класса при передаче в функцию!");
    }


    if (lvl === 1) {
        return stats.find(_class => (className.name || className) === _class.name);
    }

    let statsTemplate = {...stats.find(_class => (className.name || className) === _class.name)};
    statsTemplate.attack = Math.ceil(statsTemplate.attack * Math.pow(1.105, lvl - 1) + 8);
    statsTemplate.defence = Math.ceil(statsTemplate.defence * Math.pow(1.102, lvl - 1) + 6);
    statsTemplate.hp = Math.ceil(statsTemplate.maxHp * lvl * 1.036) + 45;
    statsTemplate.maxHp = Math.ceil(statsTemplate.maxHp * lvl * 1.036) + 45;
    statsTemplate.mp = Math.ceil(statsTemplate.maxMp * lvl * 1.0375) + 25;
    statsTemplate.maxMp = Math.ceil(statsTemplate.maxMp * lvl * 1.0375) + 25;
    statsTemplate.maxCp = Math.ceil(statsTemplate.maxCp * lvl * 1.0224) + 37;
    statsTemplate.cp = Math.ceil(statsTemplate.cp * lvl * 1.224) + 37;

    return statsTemplate;
}