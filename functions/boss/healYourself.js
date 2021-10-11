module.exports = function (session, potion) {
    let player = session.game.boss;

    if (player.hp <= 0) {
        return `@${session.userChatData.user.username}, мёртвым не нужны припарки. Ты восстановишь хп после нового призыва босса.`;
    }

    if (player.damagedHp === 0) {
        return `@${session.userChatData.user.username}, ты не ранен, незачем восстанавливать хп.`;
    }

    if (potion === "1000") {
        session.game.inventory.potions[0].count--;
        session.game.boss.damagedHp -= 1000;
        if (session.game.boss.damagedHp < 0) {
            session.game.boss.damagedHp = 0;
        }
        return `@${session.userChatData.user.username}, ты восстановил своё хп на 1000`;
    } else if (potion === "3000") {
        session.game.inventory.potions[1].count--;
        session.game.boss.damagedHp -= 3000;
        if (session.game.boss.damagedHp < 0) {
            session.game.boss.damagedHp = 0;
        }
        return `@${session.userChatData.user.username}, ты восстановил своё хп на 3000`;
    }
    return `@${session.userChatData.user.username}, мёртвым не нужны припарки. Ты восстановишь хп после нового призыва босса.`;
};