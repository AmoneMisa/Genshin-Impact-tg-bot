const getClassStatsFromTemplate = require("../player/getters/getGameClassStatsFromTemplate");
const getClassSkillsFromTemplate = require("../player/getters/getGameClassSkillsFromTemplate");
const classStatsTemplate = require("../../../templates/classStatsTemplate");
const getRandom = require("../../getters/getRandom");

module.exports = function (rating) {
    let className = classStatsTemplate[getRandom(1, classStatsTemplate.length - 1)].name;
    let ratingKey = Array.from(Object.keys(levelsMap)).findLast(ratingKey => rating >= parseInt(ratingKey));
    let lvl = levelsMap[ratingKey];
    let stats = getClassStatsFromTemplate(className, lvl);
    let skills = getClassSkillsFromTemplate(className);

    return {
        name: getRandom(1, 99999),
        stats: {lvl},
        gameClass: {skills, stats},
        ratingKey: (parseInt(ratingKey) === 0) ? 1000 : ratingKey
    };
}

const levelsMap = {
    0: 15,
    1000: 20,
    1151: 25,
    1251: 30,
    1301: 30,
    1351: 35,
    1381: 35,
    1421: 50,
    1500: 65,
    1550: 75
}

