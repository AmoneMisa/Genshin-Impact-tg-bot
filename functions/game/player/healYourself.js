const getUserName = require('../../getters/getUserName');
const getEmoji = require('../../getters/getEmoji');

module.exports = function (session, potion) {
    let player = session.game;

    if (player.stats.hp <= 0) {
        return `@${getUserName(session, "nickname")}, мёртвым не нужны припарки. Ты восстановишь ${getEmoji("hp")} хп после нового призыва босса.`;
    }

    if (player.stats.hp === player.stats.maxHp) {
        return `@${getUserName(session, "nickname")}, ты не ранен, незачем восстанавливать ${getEmoji("hp")} хп.`;
    }

    potion.count--;
    player.stats.hp += potion.power;

    if (player.stats.hp > player.stats.maxHp) {
        player.stats.hp = player.stats.maxHp;
    }

    return `@${getUserName(session, "nickname")}, ты восстановил своё ${getEmoji("hp")} хп на ${potion.power}.`;
};