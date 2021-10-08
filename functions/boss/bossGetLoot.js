const bossTemplate = require('../../templates/bossTemplate');
const levelsTemplate = require('../../templates/levelsTemplate');

module.exports = function (boss, sessions, sendMessage) {
    if (boss.damagedHp < boss.hp) {
        return false;
    }

    let message = `Лут группы после убийства босса\n\n`;
    // if (!session.game.inventory) {
    //     session.game.inventory = {};
    // }
    let arrSessions = Object.values(sessions);
    arrSessions = arrSessions.filter(item => item?.game?.boss?.damage !== undefined);
    arrSessions.sort((a, b) => b.game.boss.damage - a.game.boss.damage);

    let i = 1;

    for (let session of arrSessions) {
        if (!session.game.stats) {
            session.game.stats = {};
            session.game.stats.currentExp = 0;
            session.game.stats.lvl = 1;
        }

        let expAmount;

        if (i === 1) {
            expAmount = bossTemplate.lvls[0].loot.experience[0];
            session.game.stats.currentExp += bossTemplate.lvls[0].loot.experience[0];
        } else if (i === 2) {
            expAmount = bossTemplate.lvls[0].loot.experience[1];
            session.game.stats.currentExp += bossTemplate.lvls[0].loot.experience[1];
        } else if (i === 3) {
            expAmount = bossTemplate.lvls[0].loot.experience[2];
            session.game.stats.currentExp += bossTemplate.lvls[0].loot.experience[2];
        } else {
            expAmount = bossTemplate.lvls[0].loot.experience[3];
            session.game.stats.currentExp += bossTemplate.lvls[0].loot.experience[3];
        }

        for (let level of levelsTemplate) {
            if (level.lvl === session.game.stats.lvl) {
                if (session.game.stats.currentExp >= level.needExp) {
                    session.game.stats.currentExp -= level.needExp;
                    session.game.stats.lvl++;
                    continue;
                }

                session.game.stats.needExp = level.needExp - session.game.stats.currentExp;
            }
        }
        message += `${session.userChatData.user.first_name} - получил к-во опыта: ${expAmount}, текущий уровень: ${session.game.stats.lvl}, нужно до следующего уровня: ${session.game.stats.needExp}\n`;
        i++;
    }

    sendMessage(message);
    return true;
};