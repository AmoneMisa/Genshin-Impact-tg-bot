module.exports = function (session, skill) {
    let buffType = skill.effect;
    let amount = skill.buffPower;

    return {buffType, amount};
};