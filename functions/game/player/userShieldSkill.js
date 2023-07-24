module.exports = function (session, skill) {
    let maxHp = session.game.gameClass.stats.maxHp;
    let modifier = skill.shieldPower;
    let shield;

    shield = Math.ceil(maxHp * modifier);

    return shield;
};