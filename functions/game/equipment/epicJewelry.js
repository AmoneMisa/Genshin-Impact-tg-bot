import {EPIC_PASSIVES} from '../../../template/l2EpicJewelry.js';

const labels = {pAtk:'P.Atk',mAtk:'M.Atk',maxHp:'HP',regMp:'Регенерация MP',mCritRate:'Магический крит',
    critDmg:'Крит. урон',accCombat:'Точность',rEvas:'Уклонение',pAtkSpd:'Скорость атаки',mAtkSpd:'Скорость магии',
    pReuse:'Откат физических навыков',mReuse:'Откат магии',healEffect:'Эффективность лечения',
    magicalMpConsumeRate:'Расход MP магии',physicalMpConsumeRate:'Расход MP физических навыков',
    reflectDam:'Отражение ближнего урона',absorbDam:'Вампиризм',fireRes:'Защита от огня',waterRes:'Защита от воды',
    earthRes:'Защита от земли',darkRes:'Защита от тьмы',BLEED:'Кровотечение',POISON:'Яд',HOLD:'Удержание',
    SHOCK:'Оглушение',SLEEP:'Сон',PARALYZE:'Паралич',DERANGEMENT:'Ментальные атаки'};
const trim = value => String(Math.round(value * 10000) / 10000);
/** Original item/passive values for inspection; the combat engine adapts flat gear stats. */
export function describeEpicJewelry(item) {
    const lines = [`M.Def ${item.mDef}`, `MP +${item.maxMp}`];
    for (const row of item.skills || []) {
        const skill = EPIC_PASSIVES[row.id];
        for (const effect of skill?.effects || []) for (const node of effect.children || []) {
            const raw = String(node.value || '');
            const value = Number(raw.startsWith('#') ? skill.tables[raw]?.[row.level - 1] : raw);
            if (!Number.isFinite(value)) continue;
            if (node.stat && node.stat !== 'maxMp') {
                const amount = node.tag === 'mul' ? (value - 1) * 100 : node.tag === 'sub' ? -value : value;
                lines.push(`${labels[node.stat] || node.stat} ${amount >= 0 ? '+' : ''}${trim(amount)}${node.tag === 'mul' || ['reflectDam','absorbDam'].includes(node.stat) ? '%' : ''}`);
            } else if (['DefenceTrait','AttackTrait'].includes(effect.name) && !node.stat && value) {
                lines.push(`${effect.name === 'DefenceTrait' ? 'Защита' : 'Шанс'}: ${labels[node.tag] || node.tag} +${value}%`);
            }
        }
    }
    return lines.join(' · ');
}
