module.exports = function (session, boss, dmg) {
    let player = session.game.boss;
    let finalDmg = dmg;

    if (boss.skill.effect.includes("reflect")) {
        finalDmg = Math.ceil(finalDmg * 0.3);
        if (player.damagedHp < player.hp) {
            player.damagedHp += finalDmg;
        } else {
            player.isDead = true;
        }

        return `Босс нанёс тебе ${finalDmg} урона рефлектом. Твоё оставшееся хп: ${player.hp - player.damagedHp}`;
    }

    if (boss.skill.effect.includes("rage")) {
        finalDmg = Math.ceil(finalDmg * 0.5);
        if (player.damagedHp < player.hp) {
            player.damagedHp += finalDmg;
        } else {
            player.isDead = true;
        }
        return `Босс нанёс тебе ${finalDmg} урона рефлектом. Твоё оставшееся хп: ${player.hp - player.damagedHp}`;
    }

    return "";
};