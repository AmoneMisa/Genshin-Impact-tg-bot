const setSkillCooltime = require('./setSkillCooltime');
const skillUsageCost = require('./skillUsageCost');

module.exports = function (session, skill) {
    if (setSkillCooltime(skill)) {
        if (skillUsageCost(session, skill)) {
            return true;
        }
    }

    return false;
};