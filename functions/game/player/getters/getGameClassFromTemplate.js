import skills from './getGameClassSkillsFromTemplate.js';
import stats from './getGameClassStatsFromTemplate.js';

// Cloned: a player's class must never alias the shared template objects, or
// updatePlayerStats / skill cooldowns / enchant levels would write into the template.
export default function (playerClass) {
    return structuredClone({skills: skills(playerClass), stats: stats(playerClass)});
};
