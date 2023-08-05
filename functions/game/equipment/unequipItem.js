module.exports = function (player, item) {
    item.isUsed = false;

    for (let _slot of item.slots) {
        player.equipmentStats[_slot] = null;
    }
}