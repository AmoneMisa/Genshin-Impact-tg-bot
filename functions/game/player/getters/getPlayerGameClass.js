import getClassStatsFromTemplate from './getGameClassStatsFromTemplate.js';
export default function (gameClass) {
    if (!gameClass) {
        gameClass = getClassStatsFromTemplate("noClass");
    }

    return {skills: gameClass.skills, stats: gameClass.stats || gameClass};
};