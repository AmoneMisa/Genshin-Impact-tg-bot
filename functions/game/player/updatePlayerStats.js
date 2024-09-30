import getClassStatsFromTemplate from './getters/getGameClassStatsFromTemplate.js';
import changePlayerClass from './changePlayerGameClass.js';

export default function (session) {
    let template = getClassStatsFromTemplate(session?.game?.gameClass?.stats?.name);

    if (!session.game.hasOwnProperty("gameClass")) {
        changePlayerClass(session, "noClass");
    }

    session.game.gameClass.stats.attack = Math.ceil(template.attack * Math.pow(1.105, session.game.stats.lvl - 1) + 8);
    session.game.gameClass.stats.defence = Math.ceil(template.defence * Math.pow(1.102, session.game.stats.lvl - 1) + 6);
    session.game.gameClass.stats.hp = Math.ceil(template.maxHp * session.game.stats.lvl * 1.036) + 45;
    session.game.gameClass.stats.maxHp = Math.ceil(template.maxHp * session.game.stats.lvl * 1.036) + 45;
    session.game.gameClass.stats.mp = Math.ceil(template.maxMp * session.game.stats.lvl * 1.0375) + 25;
    session.game.gameClass.stats.maxMp = Math.ceil(template.maxMp * session.game.stats.lvl * 1.0375) + 25;
    session.game.gameClass.stats.maxCp = Math.ceil(template.maxCp * session.game.stats.lvl * 1.0224) + 37;
    session.game.gameClass.stats.cp = Math.ceil(template.cp * session.game.stats.lvl * 1.224) + 37;
    session.game.gameClass.stats.criticalDamage = template.criticalDamage;
    session.game.gameClass.stats.criticalChance = template.criticalChance;
    session.game.gameClass.stats.additionalDamageMul = template.additionalDamageMul;
    session.game.gameClass.stats.incomingDamageModifier = template.incomingDamageModifier;
    session.game.gameClass.stats.speed = Math.ceil(template.speed + ((session.game.stats.lvl / 12) * 2));
};