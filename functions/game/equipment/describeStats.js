// Player-facing text for the stats an equipment item carries (Mini App cards and the text bot).
import statsDictionary from '../../../dictionaries/statsDictionary.js';
import { itemExtras, isFactorStat } from './itemBonuses.js';

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
    castingSpeedMul:'Скорость магии',attackSpeedMul:'Скорость атаки',criticalChanceMul:'Шанс критического удара',pvpDamageMul:'Урон в PvP',skillMpCostMul:'Расход MP',vampirism:'Вампиризм',weightLimitMul:'Лимит веса',
};

const POINT_PERCENT = new Set(['power', 'defencePower']);

function trim(value) {
    return String(Math.round(value * 100) / 100);
}

/** One characteristic as {name, label, value, text}: factors become percentages ("+3% Макс. ХП"). */
export function describeStat(name, value, extra = null, masterwork = false) {
    const label = LABELS[name] || name;
    const number = Number(value) || 0;
    let text;
    if (POINT_PERCENT.has(name)) text = `${label} +${trim(number)}%`;
    else if (name === 'randomDamage') text = `${label} ±${trim(number * 100)}%`;
    else if (isFactorStat(name) || name === 'criticalDamage') {
        const percent = (number - 1) * 100;
        text = `${label} ${percent >= 0 ? '+' : ''}${trim(percent)}%`;
    } else text = `${label} ${number >= 0 ? '+' : ''}${trim(number)}`;
    if (extra) text += masterwork ? ` (+${trim(extra)} от заточки и MW)` : ` (+${trim(extra)} от заточки)`;
    return { name, label, value: number, text };
}

/** All stats of an item (characteristics with the enchant bonus, then its special ability). */
export function describeItemStats(item) {
    const extras = itemExtras(item);
    const lines = Object.entries(item?.characteristics || {}).map(([name, value]) => describeStat(name, value, extras[name], Boolean(item?.masterwork)));
    // a masterwork item can carry a stat its ordinary version does not have
    for (const [name, value] of Object.entries(extras)) {
        if (!(name in (item?.characteristics || {}))) lines.push(describeStat(name, value, value, true));
    }
    for (const stat of item?.stats || []) {
        if (typeof stat?.value === 'number') {
            const line = describeStat(stat.name, stat.value);
            lines.push(stat.label ? { ...line, text: `${stat.label}: ${line.text}` } : line);
        }
    }
    return lines;
}
