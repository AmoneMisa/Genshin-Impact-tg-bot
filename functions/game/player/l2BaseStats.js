import DATA from '../../../template/l2PlayerStats.js';

export const L2_STATS_VERSION = 1;
export function l2BaseStats(template, level=1) {
    const source = DATA[template?.l2Id];
    if (!source) return null;
    const lvl = Math.max(1, Math.min(85, Math.floor(Number(level)||1)));
    const row = source.levels[lvl];
    if (!row) return null;
    const bonus=(89+lvl)/100;
    const pAtk=Math.max(1,Math.round(source.base.PAtk*bonus**2));
    const mAtk=Math.max(1,Math.round(source.base.MAtk*bonus**2));
    const pDef=Math.round(source.base.PDef*bonus);
    const mDef=Math.round(source.base.MDef*bonus);
    return {pAtk,mAtk,pDef,mDef,attack:['mage','priest'].includes(template.family)?mAtk:pAtk,defence:pDef,
        hp:Math.round(row[0]),maxHp:Math.round(row[0]),mp:Math.round(row[1]),maxMp:Math.round(row[1]),
        cp:Math.round(row[2]),maxCp:Math.round(row[2]),
        hpRestoreSpeed:row[3],mpRestoreSpeed:row[4],cpRestoreSpeed:row[5],speed:source.speed};
}
export const l2Characteristics = classId => DATA[classId]?.base || null;
