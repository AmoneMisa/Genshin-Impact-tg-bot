module.exports = function (chances, n) {
    let fullChance = 1;
    chances.slice(Math.max(0, chances.length - n) + 1, chances.length).forEach(({chance}) => fullChance -= chance);

    let newChances = chances.slice(Math.max(0, chances.length - n), chances.length);
    newChances[0].chance = fullChance;

    return newChances;
}