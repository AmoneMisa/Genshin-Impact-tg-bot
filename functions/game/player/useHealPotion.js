module.exports = function (session, potion) {
    let player = session.game.gameClass.stats;

    if (player.hp <= 0) {
        return 1;
    }

    if (player.hp === player.maxHp) {
        return 2;
    }

    potion.count--;
    player.hp += potion.power;

    if (player.hp > player.maxHp) {
        player.hp = player.maxHp;
    }

    session.game.gameClass.stats.hp = player.hp;
    session.game.inventory.potions.find(_potion => _potion.name === potion.name && _potion.power === potion.power).count = potion.count;
    return 0;
};