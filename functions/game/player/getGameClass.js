const skills = require('../../../templates/classSkillsTemplate');
const stats = require('../../../templates/classStatsTemplate');

module.exports = function (playerClass) {
    return {skills: skills[playerClass], stats: stats.find(_class => playerClass.name === _class.name)};
};