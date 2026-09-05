import getRandom from "../../getters/getRandom.js";
import generateRandomEquipment from "../../game/equipment/generateRandomEquipment.js";
import getValueByChance from "../../getters/getValueByChance.js";
import getBossLoot from "./getters/getBossLoot.js";
import setLevel from "../player/setLevel.js";
import getSession from "../../getters/getSession.js";
import lodash from "lodash";
import Chat from "../../../db/models/Chat.js";

export default async function(boss, chatId) {
    if (boss.currentHp > 0) {
        return false;
    }

    let i = 1;
    let gotLoot = {};
    let players = boss.listOfDamage;
    players.sort((a, b) => b.damage - a.damage);

    // Получаем всех участников чата
    const chat = await Chat.findOne({ chatId });
    if (!chat) throw new Error(`Чат ${chatId} не найден`);

    let playedSessions = chat.members
        .filter(m => !m.isHided)
        .filter(m => players.find(p => p.id === m.userId));

    for (let member of playedSessions) {
        const userId = member.userId;

        if (!member.game.stats) {
            member.game.stats = { currentExp: 0, lvl: 1 };
        }

        const loot = getBossLoot(boss);

        const expAmount = getExperienceReward(i, loot);
        member.game.stats.currentExp += expAmount;

        const gotGold = getGoldReward(i, loot);
        member.game.inventory.gold += gotGold;

        const gotCrystals = getCrystalsReward(i, loot);
        member.game.inventory.crystals += gotCrystals;

        if (i === 1) {
            member.game.inventory.equipment.items.push(
                generateRandomEquipment(member.game.stats.lvl)
            );
        }

        setLevel(member);

        gotLoot[userId] = {
            stats: member.game.stats,
            inventory: member.game.inventory,
            gotGold,
            gotCrystals,
            expAmount
        };

        i++;
    }

    // Дополнительные награды
    let randomPlayedSessions = getEquipmentRewardList(getBossLoot(boss), playedSessions);
    for (let member of randomPlayedSessions) {
        const userId = member.userId;
        const item = generateRandomEquipment(member.game.stats.lvl);
        member.game.inventory.equipment.items.push(item);
        gotLoot[userId].equipment = item.name;
    }

    if (players.length > 0) {
        const firstPlaceUserId = players[0].id;
        const member = chat.members.find(m => m.userId === firstPlaceUserId);
        const item = generateRandomEquipment(member.game.stats.lvl);
        member.game.inventory.equipment.items.push(item);
        gotLoot[firstPlaceUserId].firstPlaceEquipment = item.name;
    }

    await chat.save();
    return gotLoot;
}

// ----------------- вспомогательные функции -----------------

function getGoldReward(place, loot) {
    let goldChance = Math.random();
    let goldRewardObj = getValueByChance(goldChance, loot.gold);
    if (lodash.isUndefined(goldRewardObj) || lodash.isNull(goldRewardObj)) return 0;
    return getRandom(goldRewardObj.minAmount, goldRewardObj.maxAmount);
}

function getExperienceReward(place, loot) {
    const maxPlace = loot.experience.length;
    place = Math.min(place, maxPlace);
    return getRandom(
        loot.experience[place - 1].value.minAmount,
        loot.experience[place - 1].value.maxAmount
    );
}

function getCrystalsReward(place, loot) {
    let crystalChance = Math.random();
    let crystalRewardObj = getValueByChance(crystalChance, loot.crystals);
    if (lodash.isUndefined(crystalRewardObj) || lodash.isNull(crystalRewardObj)) return 0;
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
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }
    return array;
}
