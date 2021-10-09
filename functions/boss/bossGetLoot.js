const bossTemplate = require('../../templates/bossTemplate');
const levelsTemplate = require('../../templates/levelsTemplate');
const getRandom = require('../getRandom');

module.exports = function (boss, sessions, sendMessage) {
    if (boss.damagedHp < boss.hp) {
        return false;
    }

    let message = `Лут группы после убийства босса\n\n`;
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
            session.game.stats.currentExp += bossTemplate.lvls[0].loot.experience[2];;
        } else {
            expAmount = bossTemplate.lvls[0].loot.experience[3];
            session.game.stats.currentExp += bossTemplate.lvls[0].loot.experience[3];
        }

        let gotGold = 0;

        for (let gold of bossTemplate.lvls[0].loot.gold) {
            let chance = getRandom(1, 100);

            if (chance <= gold.chance) {
                gotGold = getRandom(gold.minAmount, gold.maxAmount);
                session.game.inventory.gold += gotGold;
            }
        }

        for (let level of levelsTemplate) {
            if (level.lvl === session.game.stats.lvl) {
                if (session.game.stats.currentExp >= level.needExp) {
                    session.game.stats.currentExp -= level.needExp;
                    session.game.stats.lvl++;
                    session.game.inventory.gold += ( 1000 * session.game.stats.lvl * 0.33);
                    continue;
                }

                session.game.stats.needExp = level.needExp - session.game.stats.currentExp;
            }
        }
        message += `${session.userChatData.user.first_name} - получил к-во опыта: ${expAmount}, текущий уровень: ${session.game.stats.lvl}, нужно до следующего уровня: ${session.game.stats.needExp}\nПолучил к-во золота: ${gotGold}, всего золота: ${session.game.inventory.gold}`;
        i++;
    }

    sendMessage(message);
    return true;
};