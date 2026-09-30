import getRandom from '../../getters/getRandom.js';
import getPlayerDefence from '../player/getters/getDefence.js';
import getIncomingDamageModifier from '../player/getters/getIncomingDamageModifier.js';
import getBossAttack from './getBossStats/getBossAttack.js';
import bossesTemplate from '../../../template/bossTemplate.js';

export default function (boss, session) {
    // The template of this boss (the old callback shadowed `boss` and always
    // matched the first template).
    let bossTemplate = bossesTemplate.find(template => template.name === boss.name) || bossesTemplate[0];
    let attack = getBossAttack(boss, bossTemplate);
    let defence = getPlayerDefence(session, session.game.gameClass);
    let reduceIncomingPlayerDamage = getIncomingDamageModifier(session, session.game.gameClass) + 1;
    let dmg = Math.ceil(getRandom(boss.stats.minDamage, boss.stats.maxDamage) * attack / defence) * reduceIncomingPlayerDamage;

    if (Math.random() * 100 <= boss.stats.criticalChance) {
        dmg *= boss.stats.criticalDamage;
    }

    return dmg;
};