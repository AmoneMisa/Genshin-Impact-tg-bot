module.exports = function (skill) {
    if (!skill.hasOwnProperty("cooltimeReceive") || skill.cooltimeReceive === 0) {
        skill.cooltimeReceive = skill.cooltime;

        return true;
    }

    return false;
};