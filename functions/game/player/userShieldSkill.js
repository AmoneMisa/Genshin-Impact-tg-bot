module.exports = function (session, skill) {
    let hp = session.game.boss.hp;
    let modificator = skill.shieldPower;
    let shield;

    shield = Math.ceil(hp * modificator);

    return shield;
};