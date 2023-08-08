const skills = require('./getGameClassSkillsFromTemplate');
const stats = require('./getGameClassStatsFromTemplate');

module.exports = function (playerClass) {
    return {skills: skills(playerClass), stats: stats(playerClass)};
};