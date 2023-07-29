module.exports = function (skill) {
    skill.cooldownReceive = new Date().getTime() + (skill.cooldown * 1000);
};