const classes = require('../../../templates/classSkillsTemplate');

module.exports = function (playerClass) {
    if (playerClass.hasOwnProperty(playerClass)) {
        return classes[playerClass];
    }
};