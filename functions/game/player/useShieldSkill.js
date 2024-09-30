import getMaxHp from './getters/getMaxHp.js';
export default function (session, skill) {
    let maxHp = getMaxHp(session, session.game.gameClass);
    let modifier = skill.shieldPower;
    let shield;

    shield = Math.ceil(maxHp * modifier);

    return shield;
};