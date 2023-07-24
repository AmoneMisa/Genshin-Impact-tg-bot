module.exports = function (boss, dmg) {
    let finalDmg = dmg;
    let modifier = 0;

    if (boss.skill.effect.includes("reflect")) {
        modifier = 0.3;
    }

    if (boss.skill.effect.includes("rage")) {
        modifier = 0.5;
    }

    finalDmg = Math.ceil(finalDmg * modifier);

    return finalDmg;
};