module.exports = function (session, boss, dmg) {
    let player = session.game.boss;
    let finalDmg = dmg;

    if (boss.skill.effect.includes("reflect")) {
        finalDmg = Math.ceil(finalDmg * 0.3);
        if (player.currentHp <= 0) {
            player.currentHp -= finalDmg;
        } else {
            player.isDead = true;
        }

        return `Босс нанёс тебе ${finalDmg} урона рефлектом. Твоё оставшееся хп: ${player.currentHp}`;
    }

    if (boss.skill.effect.includes("rage")) {
        finalDmg = Math.ceil(finalDmg * 0.5);
        if (player.currentHp <= 0) {
            player.currentHp -= finalDmg;
        } else {
            player.isDead = true;
        }
        return `Босс нанёс тебе ${finalDmg} урона рефлектом. Твоё оставшееся хп: ${player.currentHp}`;
    }

    return "";
};