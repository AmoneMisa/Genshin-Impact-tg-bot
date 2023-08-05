module.exports = function (player, item, slot) {
    item.isUsed = false;

    for (let _slot of slot) {
        player.equipmentStats[_slot] = null;
    }
}