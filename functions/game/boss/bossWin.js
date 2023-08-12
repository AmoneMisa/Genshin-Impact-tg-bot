module.exports = function (boss, sessions) {
    if (boss.aliveTime > new Date().getTime()) {
        return;
    }

    for (let player of boss.listOfDamage) {
        sessions[player.id].currentHp = 0;
    }

    boss.skill = null;
    boss.currentHp = 0;
    boss.hp = 0;
    boss.listOfDamage = [];
}