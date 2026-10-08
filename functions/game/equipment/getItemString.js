import equipmentTemplate from '../../../template/equipmentTemplate.js';
import statsDictionary from '../../../dictionaries/statsDictionary.js';
import inventory from '../../../dictionaries/inventory.js';
import { describeItemStats } from './describeStats.js';
import { getEnchantLevel, safeEnchantLevel } from './itemBonuses.js';

const CLASS_NAMES = {warrior: 'Воин', assassin: 'Разбойник', archer: 'Лучник', priest: 'Жрец', mage: 'Маг'};

/** Text card of an equipment item for the chat bot. */
export default function (item) {
    const enchant = getEnchantLevel(item);
    let str = `${enchant ? `+${enchant} ` : ''}${item.name}\n`;
    str += `Грейд: ${item.grade === 'noGrade' ? 'без грейда' : item.grade}\n\n`;

    const owners = (item.classOwner || []).map(owner => CLASS_NAMES[owner] || statsDictionary[owner]).filter(Boolean);
    if (owners.length) str += `Классы: ${owners.join(', ')}\n\n`;

    const grade = equipmentTemplate.grades.find(entry => entry.name === item.grade);
    if (grade) str += `Минимальный уровень для использования: ${grade.lvl.from}\n\n`;

    str += `Характеристики:\n`;
    for (const line of describeItemStats(item)) {
        str += `• ${line.text}\n`;
    }

    if (item.mainType === 'weapon') {
        str += item.slots?.length === 1 ? 'Одноручное\n' : 'Двуручное\n';
    } else if (item.slots?.length) {
        str += `Слот: ${item.slots.map(slot => inventory[slot] || slot).join(' ')}\n`;
    }

    if (item.setName) str += `\nВходит в: ${item.setName} (бонус за полный комплект)\n`;
    if (item.grade !== 'noGrade' && item.slots?.length) str += `\nБезопасная заточка до +${safeEnchantLevel(item)}\n`;

    return str;
}
