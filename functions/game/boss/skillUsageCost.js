module.exports = function (session, skill) {
    if (skill.cost >= session.game.inventory.gold) {
        skill.cooltimeReceive = getOffset(skill.cooltime);
        return true
    }
    return false;
};