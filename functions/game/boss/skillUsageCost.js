module.exports = function (session, skill) {
    if (session.game.inventory.gold <= skill.cost && skill.crystalCost <= session.game.inventory.crystals) {
        session.game.inventory.gold -= skill.cost;
        session.game.inventory.crystals -= session.game.inventory.crystals;
        return true
    }
    return false;
};