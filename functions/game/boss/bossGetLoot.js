const bossTemplate = require('../../../templates/bossTemplate');
const getRandom = require('../../getRandom');
const setLevel = require('../player/setLevel');

module.exports = function (boss, sessions, sendMessage) {
    try {
        if (boss.damagedHp < boss.hp) {
            return false;
        }

        let message = `Лут группы после убийства босса\n\n`;
        let arrSessions = Object.values(sessions);
        arrSessions = arrSessions.filter(item => item?.game?.boss?.damage !== undefined && item?.game?.boss?.damage > 0);
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
                expAmount = bossTemplate.loot.experience[0];
                session.game.stats.currentExp += bossTemplate.loot.experience[0];
            } else if (i === 2) {
                expAmount = bossTemplate.loot.experience[1];
                session.game.stats.currentExp += bossTemplate.loot.experience[1];
            } else if (i === 3) {
                expAmount = bossTemplate.loot.experience[2];
                session.game.stats.currentExp += bossTemplate.loot.experience[2];
            } else {
                expAmount = bossTemplate.loot.experience[3];
                session.game.stats.currentExp += bossTemplate.loot.experience[3];
            }

            let gotGold = 0;

            let goldChance = getRandom(0, 99);
            for (let gold of bossTemplate.loot.gold) {
                if (gold.from <= goldChance && goldChance < gold.from + gold.chance) {
                    gotGold = getRandom(gold.minAmount, gold.maxAmount);
                    session.game.inventory.gold += gotGold;
                }
            }

            let gotCrystals = 0;
            let crystalChance = getRandom(0, 99);

            for (let crystals of bossTemplate.loot.crystals) {
                if (crystals.from <= crystalChance && crystalChance < crystals.from + crystals.chance) {
                    gotCrystals = getRandom(crystals.minAmount, crystals.maxAmount);
                    session.game.inventory.crystals += gotCrystals;
                }
            }

            setLevel(session);

            message += `${session.userChatData.user.first_name} - получил к-во опыта: ${expAmount}, текущий уровень: ${session.game.stats.lvl}, нужно до следующего уровня: ${session.game.stats.needExp}\nПолучил к-во золота: ${gotGold}, всего золота: ${session.game.inventory.gold}\nПолучил кристаллов: ${gotCrystals}, всего кристаллов: ${session.game.inventory.crystals}\n\n`;
            i++;
        }

        sendMessage(message);
        return true;
    } catch (e) {
        console.error(e);
    }
};