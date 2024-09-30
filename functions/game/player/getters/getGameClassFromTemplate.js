import skills from './getGameClassSkillsFromTemplate.js';
import stats from './getGameClassStatsFromTemplate.js';

export default function (playerClass) {
    return {skills: skills(playerClass), stats: stats(playerClass)};
};