module.exports = function (player, item, slot) {
    item.isUsed = false;
    console.log(item);

    if (Array.isArray(slot)) {
        for (let _slot of slot) {
            player.equipmentStats[_slot] = null;
        }
    } else {
        player.equipmentStats[slot] = null;
    }
}