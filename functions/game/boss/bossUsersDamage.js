module.exports = function (boss, sessions) {
    if (!boss) {
        return `Группа ещё не призвала босса. Призвать можно командой /summon_boss`;
    }

    if (!boss.damagedHp) {
        boss.damagedHp = 0;
        return `Ещё никто не нанёс урона боссу. Его хп: ${boss.hp} Нанести урон можно командой /damage_the_boss.`;
    }

    if (boss.hp < boss.damagedHp) {
        return  `Босс мёртв. Звоните в камбечную.`;
    }

    let arrSessions = Object.values(sessions);

    let message = `Всего нанесено урона: ${boss.damagedHp}.\nОставшееся хп: [ ${boss.hp - boss.damagedHp} ]\n\n`;

    arrSessions = arrSessions.filter(item => item.game?.boss?.damage !== undefined);
    arrSessions.sort((a, b) => b.game.boss.damage - a.game.boss.damage);

    for (let session of arrSessions) {
        message += `${session.userChatData.user.username}: ${session.game.boss.damage}\n`;
    }

    return message;
};