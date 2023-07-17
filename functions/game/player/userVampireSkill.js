module.exports = function (skill, dmg) {
    let modifier = skill.vampirePower;

    return  Math.ceil(dmg * modifier);
};