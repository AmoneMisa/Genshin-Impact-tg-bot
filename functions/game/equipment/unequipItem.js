module.exports = function (session, item) {
    item.isUsed = false;

    for (let _slot of item.slots) {
        session.game.equipmentStats[_slot] = null;
    }
}