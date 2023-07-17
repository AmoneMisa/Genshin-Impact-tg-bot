module.exports = function (session, skill) {
    let hp = session.game.stats.maxHp;
    let modifier = skill.healPower;
    let heal;

    heal = Math.ceil(hp * modifier);

    return heal;
};