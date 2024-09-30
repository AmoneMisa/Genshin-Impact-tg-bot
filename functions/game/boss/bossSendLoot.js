import getRandom from '../../getters/getRandom.js';
import generateRandomEquipment from '../../game/equipment/generateRandomEquipment.js';
import getValueByChance from '../../getters/getValueByChance.js';
import getBossLoot from './getters/getBossLoot.js';
import setLevel from '../player/setLevel.js';
import lodash from 'lodash';

export default function (boss, sessions) {
    if (boss.currentHp > 0) {
        return false;
    }

    let i = 1;
    let gotLoot = {};
    let arrSessions = Object.values(sessions);
    let players = boss.listOfDamage;
    players.sort((a, b) => b.damage - a.damage);
    let playedSessions = arrSessions
        .filter(session => !session.userChatData.user.is_bot)
        .filter(session => players.find(player => player.id === session.userChatData.user.id));

    for (let session of playedSessions) {
        let userId = session.userChatData.user.id;

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

        if (i === 1) {
            session.game.inventory.equipment.push(generateRandomEquipment(session.game.stats.lvl));
        }

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

    let randomPlayedSessions = getEquipmentRewardList(getBossLoot(boss), playedSessions);

    for (let session of randomPlayedSessions) {
        let userId = session.userChatData.user.id;
        let item = generateRandomEquipment(session.game.stats.lvl);
        session.game.inventory.equipment.push(item);
        gotLoot[userId].equipment = item.name;
    }

    if (players.length > 0) {
        let firstPlaceUserId = players[0].id;
        let session = sessions[firstPlaceUserId];
        let item = generateRandomEquipment(session.game.stats.lvl);
        session.game.inventory.equipment.push(item);
        gotLoot[firstPlaceUserId].firstPlaceEquipment = item.name;
    }

    return gotLoot;
};

function getGoldReward(place, loot) {
    let goldChance = Math.random();
    let goldRewardObj = getValueByChance(goldChance, loot.gold);

    if (lodash.isUndefined(goldRewardObj) || lodash.isNull(goldRewardObj)) {
        return 0;
    }

    return getRandom(goldRewardObj.minAmount, goldRewardObj.maxAmount);
}

function getExperienceReward(place, loot) {
    const maxPlace = loot.experience.length;
    place = Math.min(place, maxPlace);
    return getRandom(loot.experience[place - 1].value.minAmount, loot.experience[place - 1].value.maxAmount);
}

function getCrystalsReward(place, loot) {
    let crystalChance = Math.random();
    let crystalRewardObj = getValueByChance(crystalChance, loot.crystals);

    if (lodash.isUndefined(crystalRewardObj) || lodash.isNull(crystalRewardObj)) {
        return 0;
    }

    return getRandom(crystalRewardObj.minAmount, crystalRewardObj.maxAmount);
}

function getEquipmentRewardList(loot, playedSessions) {
    let equipmentCountChance = Math.random();
    let equipmentCount = getValueByChance(equipmentCountChance, loot.equipment);
    let randomPlayedSession = shuffle([...playedSessions]);
    let countSessions = Math.round(playedSessions.length * equipmentCount);
    return randomPlayedSession.slice(0, countSessions);
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}