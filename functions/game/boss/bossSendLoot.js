const getRandom = require('../../getters/getRandom');
const getBossLoot = require('./getters/getBossLoot');
const setLevel = require('../player/setLevel');

module.exports = function (boss, sessions) {
    if (boss.currentHp > 0) {
        return false;
    }

    let players = boss.listOfDamage;
    players.sort((a, b) => b.damage - a.damage);

    let i = 1;
    let gotLoot = {};
    let arrSessions = Object.values(sessions);
    arrSessions.filter(session => !session.userChatData.user.is_bot);

    for (let session of arrSessions) {
        let userId = session.userChatData.user.id;
        if (!players.find(player => player.id === userId)) {
            continue;
        }

        if (!session.game.stats) {
            session.game.stats = {};
            session.game.stats.currentExp = 0;
            session.game.stats.lvl = 1;
        }

        let loot = getBossLoot(boss);
        let expAmount = getExperienceReward(i, loot);
        session.game.stats.currentExp += expAmount;

        let gotGold = getGoldReward(i, loot);
        session.game.inventory.gold += gotGold;

        let gotCrystals = getCrystalsReward(i, loot);
        session.game.inventory.crystals += gotCrystals;

        setLevel(session);
        gotLoot[userId] = {
            username: session.userChatData.user.username,
            stats: session.game.stats,
            inventory: session.game.inventory,
            gotGold,
            gotCrystals,
            expAmount
        };
        i++;
    }

    return gotLoot;
};

function getGoldReward(place, loot) {
    let goldChance = getRandom(0, 99);

    for (const gold of loot.gold) {
        if (gold.from <= goldChance && goldChance < gold.from + gold.chance) {
            return getRandom(gold.minAmount, gold.maxAmount);
        }
    }

    return 0;
}

function getExperienceReward(place, loot) {
    const maxPlace = loot.experience.length;
    place = Math.min(place, maxPlace);
    return getRandom(loot.experience[place - 1].min, loot.experience[place - 1].max);
}

function getCrystalsReward(place, loot) {
    let crystalChance = getRandom(0, 99);

    for (const crystals of loot.crystals) {
        if (crystals.from <= crystalChance && crystalChance < crystals.from + crystals.chance) {
            return getRandom(crystals.minAmount, crystals.maxAmount);
        }
    }

    return 0;
}