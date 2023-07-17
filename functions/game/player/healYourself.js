const getUserName = require('../../getters/getUserName');

module.exports = function (session, potion) {
    let player = session.game.boss;

    if (player.hp <= 0) {
        return `@${getUserName(session, "nickname")}, мёртвым не нужны припарки. Ты восстановишь хп после нового призыва босса.`;
    }

    if (player.damagedHp === 0) {
        return `@${getUserName(session, "nickname")}, ты не ранен, незачем восстанавливать хп.`;
    }

    if (potion === "1000") {
        session.game.inventory.potions[0].count--;
        session.game.stats.currentHp += 1000;
        if (session.game.stats.currentHp < 0) {
            session.game.stats.currentHp = 0;
        }
        return `@${getUserName(session, "nickname")}, ты восстановил своё хп на 1000`;
    } else if (potion === "3000") {
        session.game.inventory.potions[1].count--;
        session.game.stats.currentHp += 3000;
        if (session.game.stats.currentHp < 0) {
            session.game.stats.currentHp = 0;
        }
        return `@${getUserName(session, "nickname")}, ты восстановил своё хп на 3000`;
    }
    return `@${getUserName(session, "nickname")}, мёртвым не нужны припарки. Ты восстановишь хп после нового призыва босса.`;
};