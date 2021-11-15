module.exports = function (skill) {
    if (skill.cooltimeReceive > 0) {
        return skill.cooltimeReceive;
    }

    skill.cooltimeReceive = skill.cooltime;

    return 0;
};