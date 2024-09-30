import getEquipStatByName from './getters/getEquipStatByName.js';
import getSpeed from './getters/getSpeed.js';

export default function (skill, session) {
    let speedMul = getSpeed(session, session.game.gameClass) / 97;
    let cooltime = skill.cooldown * 1000 * getEquipStatByName(session, "skillCooltimeMul", true) * (1 / speedMul) ;
    skill.cooldownReceive = new Date().getTime() + cooltime;
};