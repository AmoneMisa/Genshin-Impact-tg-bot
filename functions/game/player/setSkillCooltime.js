module.exports = function (skill) {
    if (skill.cooltimeReceive > 0) {
        return false;
    }

    skill.cooltimeReceive = skill.cooltime;

    return true;
};