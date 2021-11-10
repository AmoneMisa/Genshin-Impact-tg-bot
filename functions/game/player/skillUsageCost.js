module.exports = function (session, skill) {
    if (skill.cost <= session.game.inventory.gold && skill.crystalCost <= session.game.inventory.crystals) {
        session.game.inventory.gold -= skill.cost;
        session.game.inventory.crystals -= skill.crystalCost;
        return true
    } else {
        return false;
    }
};