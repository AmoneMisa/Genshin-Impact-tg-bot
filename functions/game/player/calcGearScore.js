module.exports = function (player) {
    let points = 0;

    for (let [stat, value] of Object.entries(gearScoreMap)) {
        if (stat === "lvl") {
            points += player.stats.lvl * value;
        } else {
            points += player.gameClass.stats[stat] * value;
        }
    }

    return points.toFixed(2);
};

const gearScoreMap = {
    attack: 5,
    defence: 4.5,
    hp: 0.01, // 1 на 100 ед. хп
    criticalChance: 15,
    criticalDamage: 7,
    speed: 0.3, // 1 на 10 ед. скорости
    lvl: 400,
    cp: 0.02, // 2 на 100 ед. цп
    additionalDamageMul: 4,
    incomingDamageModifier: 4,
    block: 1.2,
    accuracy: 1.2,
    evasion: 1.2
};