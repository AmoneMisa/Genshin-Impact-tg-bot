import getRandom from "../../getters/getRandom.js";
import generateRandomEquipment from "../../game/equipment/generateRandomEquipment.js";
import getValueByChance from "../../getters/getValueByChance.js";
import getBossLoot from "./getters/getBossLoot.js";
import setLevel from "../player/setLevel.js";
import getSession from "../../getters/getSession.js";
import lodash from "lodash";
import Chat from "../../../db/models/Chat.js";
import { bossTemplateFor } from "./bossUnits.js";
import { addMaterial, materialInfo } from "../player/materials.js";
import { epicLuckCoins, markEpicKilled, rollEpicJewel, rollEpicWeapon } from "./epicBosses.js";
import { rollEnchantDrops } from "../equipment/enchantDrops.js";
import { rollCraftDrops } from "../equipment/craftItem.js";
import { recordQuestEvent } from "../classes/classQuests.js";
import { giveBuffPotionDrop } from "./buffPotionDrops.js";

export default async function(boss, chatId) {
    if (boss.currentHp > 0) {
        return false;
    }

    let i = 1;
    let gotLoot = {};
    const template = bossTemplateFor(boss);
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
                generateRandomEquipment(member.game.stats.lvl, undefined, {forClass: member.game.gameClass?.stats?.name})
            );
        }

        const extras = getBossDrops(template, member, i);

        setLevel(member);

        const quest = recordQuestEvent(member, {
            type: "boss_kill",
            boss: {name: boss.name, tier: template?.tier || 1, element: template?.element}
        });

        gotLoot[userId] = {
            stats: member.game.stats,
            inventory: member.game.inventory,
            gotGold,
            gotCrystals,
            expAmount,
            gotSp: extras.sp,
            items: extras.items,
            questGains: quest.gains,
            questReady: quest.ready
        };

        i++;
    }

    // Дополнительные награды
    let randomPlayedSessions = getEquipmentRewardList(getBossLoot(boss), playedSessions, template?.tier || 1);
    for (let member of randomPlayedSessions) {
        const userId = member.userId;
        const item = generateRandomEquipment(member.game.stats.lvl, undefined, {forClass: member.game.gameClass?.stats?.name});
        member.game.inventory.equipment.items.push(item);
        gotLoot[userId].equipment = item.name;
    }

    // Epic raid bosses start their respawn window and may drop their jewellery.
    if (template?.epic) {
        markEpicKilled(chat, boss.name);
        // Coins of Luck for everyone who fought the raid boss, whatever their place.
        const luckCoins = epicLuckCoins(boss.name);
        if (luckCoins) {
            for (const member of playedSessions) {
                const inventory = member.game.inventory;
                inventory.luckCoins = (Number(inventory.luckCoins) || 0) + luckCoins;
                gotLoot[member.userId].luckCoins = luckCoins;
                gotLoot[member.userId].items.push({item: "luckCoins", name: "Монеты удачи", icon: "🍀", amount: luckCoins});
            }
        }
        const drop = rollEpicJewel(template, players.map(player => ({id: player.id, damage: player.damage})));
        const winner = drop && playedSessions.find(member => member.userId === drop.id);
        if (winner) {
            winner.game.inventory.equipment.items.push(drop.item);
            gotLoot[winner.userId].epicItem = drop.item.name;
        }
        const weaponDrop=rollEpicWeapon(template,playedSessions.map(member=>({id:member.userId,damage:players.find(p=>p.id===member.userId)?.damage||0,level:member.game.stats.lvl,className:member.game.gameClass?.stats?.name})));
        const weaponWinner=weaponDrop && playedSessions.find(member=>member.userId===weaponDrop.id);
        if(weaponWinner){weaponWinner.game.inventory.equipment.items.push(weaponDrop.item);gotLoot[weaponWinner.userId].epicWeapon=weaponDrop.item.name;}
    }

    if (players.length > 0) {
        const firstPlaceUserId = players[0].id;
        const member = chat.members.find(m => m.userId === firstPlaceUserId);
        const item = generateRandomEquipment(member.game.stats.lvl, undefined, {forClass: member.game.gameClass?.stats?.name});
        member.game.inventory.equipment.items.push(item);
        gotLoot[firstPlaceUserId].firstPlaceEquipment = item.name;
    }

    await chat.save();
    return gotLoot;
}

// ----------------- вспомогательные функции -----------------

/** Skill points and upgrade materials for one fighter; the top three get better odds. */
function getBossDrops(template, member, place) {
    const drops = template?.drops;
    // Enchant scrolls and crystals of the fighter's own gear grade drop from every boss.
    const enchantItems = [
        ...rollEnchantDrops(member, {tier: template?.tier || 1, place}),
        ...rollCraftDrops(member, {tier: template?.tier || 1, place}),
    ];
    // Lineage II style buff potions (Might, Shield, Haste, ...).
    const potion = giveBuffPotionDrop(member, {tier: template?.tier || 1, place, epic: Boolean(template?.epic)});
    if (potion) enchantItems.push(potion);
    if (!drops) return {sp: 0, items: enchantItems};

    const [spMin, spMax] = drops.sp || [0, 0];
    const sp = spMax > 0 ? getRandom(spMin, spMax) : 0;
    member.game.inventory.sp = (member.game.inventory.sp || 0) + sp;

    const luck = place <= 3 ? 1.5 : 1;
    const items = [];
    for (const drop of drops.items || []) {
        if (Math.random() < Math.min(1, drop.chance * luck)) {
            const amount = getRandom(drop.min, drop.max);
            addMaterial(member, drop.item, amount);
            const info = materialInfo(drop.item);
            items.push({item: drop.item, name: info.name, icon: info.icon, amount});
        }
    }
    return {sp, items: [...items, ...enchantItems]};
}

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

// Harder bosses drop more gear: expected share of fighters x 1 / 1.3 / 1.6 by tier.
export const EQUIPMENT_TIER_MULTIPLIER = {1: 1, 2: 1.3, 3: 1.6};

/** How many of `fighters` get an extra item: the fractional part is a coin flip, so small raids still get drops sometimes. */
export function equipmentRewardCount(fighters, share, tier = 1, random = Math.random) {
    const expected = fighters * share * (EQUIPMENT_TIER_MULTIPLIER[tier] || 1);
    const whole = Math.floor(expected);
    return Math.min(fighters, whole + (random() < expected - whole ? 1 : 0));
}

function getEquipmentRewardList(loot, playedSessions, tier = 1) {
    let equipmentCountChance = Math.random();
    let equipmentShare = getValueByChance(equipmentCountChance, loot.equipment);
    let randomPlayedSession = shuffle([...playedSessions]);
    let countSessions = equipmentRewardCount(playedSessions.length, equipmentShare, tier);
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
