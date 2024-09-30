const getClassStatsFromTemplate = require("../player/getters/getGameClassStatsFromTemplate");
const getClassSkillsFromTemplate = require("../player/getters/getGameClassSkillsFromTemplate");
const classStatsTemplate = require("../../../template/classStatsTemplate");
const getRandom = require("../../getters/getRandom");

module.exports = function (rating) {
    let className = classStatsTemplate[getRandom(1, classStatsTemplate.length - 1)].name;
    let ratingObj = levelsMap.find(item => item.rating >= rating);
    let stats = getClassStatsFromTemplate(className, ratingObj.lvl);
    let skills = getClassSkillsFromTemplate(className);
    let currIndex = levelsMap.indexOf(ratingObj);
    let nexIndex = levelsMap[currIndex + 1] !== undefined && levelsMap[currIndex + 1] !== null ? currIndex + 1 : currIndex;

    return {
        name: getRandom(1, 99999),
        stats: {lvl: ratingObj.lvl},
        gameClass: {skills, stats},
        rating: (ratingObj.rating === 0) ? 1000 : getRandom(ratingObj.rating, levelsMap[nexIndex].rating)
    };
}

const levelsMap = [
    {rating: 0, lvl: 15},
    {rating: 1000, lvl: 20},
    {rating: 1151, lvl: 25},
    {rating: 1251, lvl: 30},
    {rating: 1301, lvl: 30},
    {rating: 1351, lvl: 35},
    {rating: 1381, lvl: 35},
    {rating: 1421, lvl: 50},
    {rating: 1500, lvl: 65},
    {rating: 1550, lvl: 75}
];

