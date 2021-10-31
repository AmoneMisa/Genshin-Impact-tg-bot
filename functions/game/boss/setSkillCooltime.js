function getOffset(time) {
    return new Date().getTime() + time;
}

module.exports = function (skill) {
    if (!skill.hasOwnProperty("cooltimeReceive")) {
        skill.cooltimeReceive = getOffset(skill.cooltime);
        return true;
    }

    if (skill.cooltimeReceive >= new Date().getTime()) {
        skill.cooltimeReceive = getOffset(skill.cooltime);
        return true
    }
    return false;
};