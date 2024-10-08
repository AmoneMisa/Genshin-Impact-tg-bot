import calcDamagePlayerToPlayer from './calcDamagePlayerToPlayer.js';
import calculateIncreaseGuardedResources from './calculateIncreaseGuardedResources.js';
import buildsTemplate from '../../../template/buildsTemplate.js';
import setLevel from '../player/setLevel.js';
import getMaxHp from '../player/getters/getMaxHp.js';

export default function (currentUser, targetUser) {
    let remainHp = calcDamagePlayerToPlayer(currentUser, targetUser);
    let buildTemplate = buildsTemplate["palace"];
    let maxHp = getMaxHp(targetUser, targetUser.game.gameClass);

    if (!targetUser.game.stealImmuneTimer) {
        targetUser.game.stealImmuneTimer = 0;
    }

    if (!canSteal(targetUser)) {
        return {resultCode: 1};
    }

    if (remainHp / maxHp > 0.6) {
        return {resultCode: 2, remainHp};
    }

    let defenderInventory = targetUser.game.inventory;
    if (!defenderInventory.gold) {
        defenderInventory.gold = 0;
    }

    if (!defenderInventory.crystals) {
        defenderInventory.crystals = 0;
    }

    if (!defenderInventory.ironOre) {
        defenderInventory.ironOre = 0;
    }

    let stealPercentage = (remainHp >= maxHp) ? 0.3 : 0.13;
    let guardedResources = calculateIncreaseGuardedResources(buildTemplate, targetUser.game.builds.palace.currentLvl);
    let goldToSteal = Math.ceil(Math.max(0, defenderInventory.gold - guardedResources.guardedGold) * stealPercentage);
    let ironOreToSteal = Math.ceil(Math.max(0, defenderInventory.ironOre - guardedResources.guardedIronOre) * stealPercentage);
    let crystalsToSteal = Math.ceil(Math.max(0, defenderInventory.crystals - guardedResources.guardedCrystals) * stealPercentage);

    currentUser.game.inventory.gold += goldToSteal;
    currentUser.game.inventory.ironOre += ironOreToSteal;
    currentUser.game.inventory.crystals += crystalsToSteal;

    defenderInventory.gold -= goldToSteal;
    defenderInventory.ironOre -= ironOreToSteal;
    defenderInventory.crystals -= crystalsToSteal;

    targetUser.game.stealImmuneTimer = new Date().getTime() + 2 * 60 * 60 * 1000; // 2 часа иммунитета от воровства

    let gainedExp = Math.ceil(Math.max(9500, (currentUser.game.stats.currentExp * 0.077 * (targetUser.game.stats.lvl - currentUser.game.stats.lvl) + 9500)));
    currentUser.game.stats.currentExp += gainedExp;
    setLevel(currentUser);

    return {resultCode: 0, goldToSteal, ironOreToSteal, crystalsToSteal, gainedExp, remainHp};
}

function canSteal(targetUser) {
    return new Date().getTime() >= targetUser.game.stealImmuneTimer;
}