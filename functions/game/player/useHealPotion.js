import getEquipStatByName from './getters/getEquipStatByName.js';
import getMaxHp from './getters/getMaxHp.js';
import getCurrentHp from './getters/getCurrentHp.js';

export default function (session, potion) {
    let player = session.game.gameClass.stats;

    if (player.hp <= 0) {
        return 1;
    }

    const currentHp = getCurrentHp(session, session.game.gameClass);
    const maxHp = getMaxHp(session, session.game.gameClass);
    if (currentHp >= maxHp) {
        return 2;
    }

    potion.count--;
    const heal = potion.power * getEquipStatByName(session, "healPowerPotionsMul", true);
    session.game.gameClass.stats.hp = Math.min(currentHp + heal, maxHp);
    session.game.inventory.potions.items.find(_potion => _potion.bottleType === potion.bottleType && _potion.name === potion.name && _potion.power === potion.power).count = potion.count;
    return 0;
};