module.exports = function (session, skill) {
    let hp = session.game.stats.maxHp;
    let modifier = skill.shieldPower;
    let shield;

    shield = Math.ceil(hp * modifier);

    return shield;
};