const setSkillCooltime = require('./setSkillCooltime');
const skillUsageCost = require('./skillUsageCost');

module.exports = function (session, skill) {
    if (skill.slot === 0) {
        return true;
    }

    if (setSkillCooltime(skill)) {
        if (skillUsageCost(session, skill)) {
            return true;
        }
    }
    return false;
};