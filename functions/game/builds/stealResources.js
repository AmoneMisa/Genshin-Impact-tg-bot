const calcDamagePlayerToPlayer = require('./calcDamagePlayerToPlayer');
const calculateIncreaseGuardedResources = require('./calculateIncreaseGuardedResources');
const buildsTemplate = require("../../../templates/buildsTemplate");
const setLevel = require("../player/setLevel");

module.exports = function (currentUser, targetUser) {
    let remainHp = calcDamagePlayerToPlayer(currentUser, targetUser);
    let buildTemplate = buildsTemplate["palace"];
    let maxHp = targetUser.game.gameClass.stats.maxHp;

    if (!targetUser.game.builds.stealImmuneTimer) {
        targetUser.game.builds.stealImmuneTimer = 0;
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

    targetUser.game.builds.stealImmuneTimer = new Date().getTime() + 2 * 60 * 60 * 1000; // 2 часа иммунитета от воровства

    let gainedExp = Math.ceil(Math.max(5500, (currentUser.game.stats.currentExp * 0.01 * (targetUser.game.stats.lvl - currentUser.game.stats.lvl) + 5500)));
    currentUser.game.stats.currentExp += gainedExp;
    setLevel(currentUser);

    return {resultCode: 0, goldToSteal, ironOreToSteal, crystalsToSteal, gainedExp, remainHp};
}

function canSteal(targetUser) {
    return new Date().getTime() >= targetUser.game.builds.stealImmuneTimer;
}