import getClassStatsFromTemplate from '../player/getters/getGameClassStatsFromTemplate.js';
import getClassSkillsFromTemplate from '../player/getters/getGameClassSkillsFromTemplate.js';
import classStatsTemplate from '../../../template/classStatsTemplate.js';
import getRandom from '../../getters/getRandom.js';

export default function (rating = 1000) {
    const availableClasses = classStatsTemplate.filter(item => item?.name && item.name !== 'noClass');
    const classTemplate = availableClasses.length
        ? availableClasses[getRandom(0, availableClasses.length - 1)]
        : classStatsTemplate[0];
    const className = classTemplate?.name || 'noClass';

    const normalizedRating = Math.max(0, Number(rating) || 1000);
    const ratingObj = levelsMap.find(item => item.rating >= normalizedRating) || levelsMap.at(-1);
    const stats = getClassStatsFromTemplate(className, ratingObj.lvl);
    const skills = getClassSkillsFromTemplate(className);
    const currentIndex = levelsMap.indexOf(ratingObj);
    const next = levelsMap[Math.min(currentIndex + 1, levelsMap.length - 1)];
    const minRating = ratingObj.rating === 0 ? 1000 : ratingObj.rating;
    const maxRating = Math.max(minRating, Number(next.rating) || minRating);

    return {
        name: getRandom(1, 99999),
        stats: {lvl: ratingObj.lvl},
        gameClass: {skills, stats},
        rating: getRandom(minRating, maxRating)
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
