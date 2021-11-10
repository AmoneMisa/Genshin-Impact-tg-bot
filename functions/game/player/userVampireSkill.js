module.exports = function (skill, dmg) {
    let modificator = skill.vampirePower;

    return  Math.ceil(dmg * modificator);
};