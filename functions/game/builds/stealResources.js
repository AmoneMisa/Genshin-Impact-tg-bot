// codes:
// 1 - У пользователя защита, нельзя воровать ресурсы
// 2 - Ты проиграл бой, ты возвращаешься ни с чем

const calcDamagePlayerToPlayer = require('calcDamagePlayerToPlayer');
const calculateIncreaseGuardedResources = require('calculateIncreaseGuardedResources');
const buildsTemplate = require("../../../templates/buildsTemplate");

module.exports = function (currentUser, targetUser) {
    let damageGiven = 0; // Урон, нанесенный текущим пользователем
    let damageReceived = 0; // Урон, полученный текущим пользователем
    let buildTemplate = buildsTemplate["palace"];

    if (!canSteal(targetUser)) {
        return 1;
    }

    if (damageGiven < targetUser.game.gameClass.stats.maxHp * 0.4) {
        return 2;
    }

    let stealPercentage = (damageGiven >= targetUser.game.gameClass.stats.maxHp) ? 0.3 : 0.13;
    let guardedResources = calculateIncreaseGuardedResources(buildTemplate, targetUser.game.builds.palace.lvl);
    let goldToSteal = Math.max(0, targetUser.game.inventory.gold - guardedResources.gold) * stealPercentage;
    let ironOreToSteal = Math.max(0, targetUser.game.inventory.ironOre - guardedResources.ironOre) * stealPercentage;
    let crystalsToSteal = Math.max(0, targetUser.game.inventory.crystals - guardedResources.crystals) * stealPercentage;

    currentUser.game.inventory.gold += goldToSteal;
    currentUser.game.inventory.ironOre += ironOreToSteal;
    currentUser.game.inventory.crystals += crystalsToSteal;

    targetUser.game.inventory.gold -= goldToSteal;
    targetUser.game.inventory.ironOre -= ironOreToSteal;
    targetUser.game.inventory.crystals -= crystalsToSteal;

    targetUser.game.builds.stealImmuneTimer = new Date().getTime() + 2 * 60 * 60 * 1000; // 2 часа иммунитета от воровства

    let gainedExp = Math.max(5500, (currentUser.game.stats.currentExp * 0.01 * (targetUser.game.stats.lvl - currentUser.game.stats.lvl) + 5500) * 100);
    currentUser.game.stats.currentExp += gainedExp;
}

function canSteal(targetUser) {
    let currentTime = new Date().getTime();
    return targetUser.game.builds.stealImmuneTimer <= currentTime;
}