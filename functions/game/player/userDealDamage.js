import bossReflectDamage from '../boss/bossReflectDamage.js';
import calcDamage from '../boss/calcDamage.js';
import userVampireSkill from './userVampireSkill.js';
import getMaxHp from './getters/getMaxHp.js';

export default function (session, boss, skill) {
    if (!boss) {
        throw new Error("Босс не найден!");
    }

    let {dmg, isHasCritical} = calcDamage(session, skill, boss);
    let vampire;
    let playerStats = session.game.gameClass.stats;

    if (skill.effect.includes("vampire")) {
        vampire = userVampireSkill(skill, dmg);
        playerStats.hp = Math.ceil(Math.min(vampire, getMaxHp(session, session.game.gameClass)));
    }

    boss.currentHp -= dmg;

    if (boss.currentHp <= 0) {
        boss.currentHp = 0;
    }

    let findPlayer = boss.listOfDamage.find(player => player.id === session.userChatData.user.id);
    if (!findPlayer) {
        boss.listOfDamage.push({id: session.userChatData.user.id, damage: dmg});
    } else {
        findPlayer.damage += dmg;
    }

    let reflectDamage;

    if (boss.skill.effect.includes("reflect") || boss.skill.effect.includes("rage")) {
        reflectDamage = bossReflectDamage(boss, dmg);
        playerStats.hp -= Math.min(playerStats.hp, reflectDamage);
        session.game.gameClass.stats.hp = playerStats.hp;

        if (playerStats.hp === 0) {
            session.game.respawnTime = new Date().getTime() + 60 * 1000; // Минута на респаун персонажа
        }
    }

    session.game.stats.inFightTimer = new Date().getTime() + 1.5 * 60 * 1000;
    return {isHasCritical, dmg, vampire: vampire || 0, reflectDamage: reflectDamage || 0};
};