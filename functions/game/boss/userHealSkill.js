module.exports = function (session, skill) {
    let hp = session.game.boss.hp;
    let modificator = skill.healPower;
    let heal;

    heal = Math.ceil(hp * modificator);

    return heal;
};