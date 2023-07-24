module.exports = function (session, skill) {
    let maxHp = session.game.gameClass.stats.maxHp;
    let modifier = skill.healPower;
    let heal;

    heal = Math.ceil(maxHp * modifier);

    return heal;
};