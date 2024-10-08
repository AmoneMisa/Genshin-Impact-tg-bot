import getEmoji from '../../getters/getEmoji.js';

export default function (boss, loot) {
    let players = boss.listOfDamage;
    players.sort((a, b) => b.damage - a.damage);

    let message = `Лут группы после убийства босса\n\n`;

    for (let playerLoot of Object.values(loot)) {
        message += `@${playerLoot.username} - получил опыта: ${getEmoji("exp")} ${playerLoot.expAmount}.
Текущий уровень: ${getEmoji("lvl")} ${playerLoot.stats.lvl}.
Нужно до следующего уровня: ${getEmoji("needExp")} ${playerLoot.stats.needExp}
Получил золота: ${getEmoji("gold")} ${playerLoot.gotGold}.
Всего золота: ${getEmoji("gold")} ${playerLoot.inventory.gold}.
Получил кристаллов: ${getEmoji("crystals")} ${playerLoot.gotCrystals}.
Всего кристаллов: ${getEmoji("crystals")} ${playerLoot.inventory.crystals}\n`;

        if (playerLoot.firstPlaceEquipment) {
            message += `Снаряжение за первое место: ${playerLoot.firstPlaceEquipment}\n`;
        }

        if (playerLoot.equipment) {
            message += `Снаряжение: ${playerLoot.equipment}\n`;
        }
    }

    return message;
}