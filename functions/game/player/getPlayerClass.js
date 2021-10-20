const skills = require('../../../templates/classSkillsTemplate');
const stats = require('../../../templates/classStatsTemplate');

module.exports = function (playerClass) {
    if (playerClass.hasOwnProperty(playerClass)) {
        return {skills: skills[playerClass], stats: stats[playerClass], name: playerClass};
    }
};