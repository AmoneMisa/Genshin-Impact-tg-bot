// Player-facing text for the stats an equipment item carries (Mini App cards and the text bot).
import statsDictionary from '../../../dictionaries/statsDictionary.js';
import { enchantExtras, isFactorStat } from './itemBonuses.js';

const LABELS = {
    ...statsDictionary,
    power: 'Сила оружия',
    randomDamage: 'Разброс урона',
    mpRestoreSpeed: 'Восстановление МП',
    hpRestoreSpeed: 'Восстановление ХП',
    cpRestoreSpeed: 'Восстановление ЦП',
    maxHpMul: 'Макс. ХП',
    maxCpMul: 'Макс. ЦП',
    maxMpMul: 'Макс. МП',
    criticalDamage: 'Крит. урон',
    incomingDamageModifier: 'Получаемый урон',
    healPowerMul: 'Исцеление навыками',
    healPowerPotionsMul: 'Исцеление зельями',
    skillCooltimeMul: 'Перезарядка навыков',
};

const POINT_PERCENT = new Set(['power', 'defencePower']);

function trim(value) {
    return String(Math.round(value * 100) / 100);
}

/** One characteristic as {name, label, value, text}: factors become percentages ("+3% Макс. ХП"). */
export function describeStat(name, value, extra = null) {
    const label = LABELS[name] || name;
    const number = Number(value) || 0;
    let text;
    if (POINT_PERCENT.has(name)) text = `${label} +${trim(number)}%`;
    else if (name === 'randomDamage') text = `${label} ±${trim(number * 100)}%`;
    else if (isFactorStat(name) || name === 'criticalDamage') {
        const percent = (number - 1) * 100;
        text = `${label} ${percent >= 0 ? '+' : ''}${trim(percent)}%`;
    } else text = `${label} ${number >= 0 ? '+' : ''}${trim(number)}`;
    if (extra) text += ` (+${trim(extra)} от заточки)`;
    return { name, label, value: number, text };
}

/** All stats of an item (characteristics with the enchant bonus, then its special ability). */
export function describeItemStats(item) {
    const extras = enchantExtras(item);
    const lines = Object.entries(item?.characteristics || {}).map(([name, value]) => describeStat(name, value, extras[name]));
    for (const stat of item?.stats || []) {
        if (typeof stat?.value === 'number') {
            const line = describeStat(stat.name, stat.value);
            lines.push(stat.label ? { ...line, text: `${stat.label}: ${line.text}` } : line);
        }
    }
    return lines;
}
