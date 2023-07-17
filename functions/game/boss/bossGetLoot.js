const bossTemplate = require('../../../templates/bossTemplate');
const getRandom = require('../../getters/getRandom');
const setLevel = require('../player/setLevel');
const getUserName = require('../../getters/getUserName');

module.exports = function (boss, sessions, sendMessage) {
    try {
        if (boss.currentHp <= 0) {
            return false;
        }

        let message = `Лут группы после убийства босса\n\n`;
        let players = boss.listOfDamage;
        players.sort((a, b) => b.damage - a.damage);

        for (let player of players) {
            message += `${getUserName(player, "nickname")}: ${players[player.id]}\n`;
        }

        let i = 1;

        let arrSessions = Object.values(sessions);
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

            message += `${getUserName(session, "name")} - получил к-во опыта: ${expAmount}, текущий уровень: ${session.game.stats.lvl}, нужно до следующего уровня: ${session.game.stats.needExp}\nПолучил к-во золота: ${gotGold}, всего золота: ${session.game.inventory.gold}\nПолучил кристаллов: ${gotCrystals}, всего кристаллов: ${session.game.inventory.crystals}\n\n`;
            i++;
        }

        sendMessage(message);
        return true;
    } catch (e) {
        console.error(e);
    }
};