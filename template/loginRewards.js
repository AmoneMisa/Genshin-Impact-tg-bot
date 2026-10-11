import {SHOT_GRADES, SHOT_PACK_PRICE, gradeLabel} from './shotsData.js';

export const LOGIN_DAY_MS = 86400000;
export const SHOT_COUPON_BASE = Object.freeze({blessed:60, soulshot:80, spiritshot:90});
export function shotCouponAmount(sourceGrade, targetGrade, kind) {
    if (!SHOT_GRADES.includes(sourceGrade) || !SHOT_GRADES.includes(targetGrade) || !Object.hasOwn(SHOT_COUPON_BASE, kind)) return 0;
    return Math.max(1, Math.floor(SHOT_COUPON_BASE[kind] * SHOT_PACK_PRICE.S / SHOT_PACK_PRICE[targetGrade] * Math.sqrt(SHOT_PACK_PRICE[sourceGrade] / SHOT_PACK_PRICE.S)));
}
export const LOGIN_KINDS = Object.freeze({
    shots:'Купон на заряды', fame:'Талон на славу', fishing:'Талон рыбака', buff:'Купон на бафф',
    shadow_weapon:'Теневое оружие +6', shadow_armor:'Теневая броня +6', shadow_jewelry:'Теневая бижутерия +6',
    box:'Месячная коробка', resurrection:'Благословенное воскрешение',
    rune_drop:'Руна дропа +50% · 2 дня', rune_exp:'Руна опыта +50% · 2 дня', rune_craft:'Руна крафта +5% · 1 день',
});
export const loginKey = (kind, grade) => `login_${kind}_${grade}`;
export function loginItemInfo(key) {
    for (const kind of Object.keys(LOGIN_KINDS)) for (const grade of SHOT_GRADES) {
        if (key !== loginKey(kind, grade)) continue;
        if (kind.startsWith('shadow_') && !['C','B','A'].includes(grade)) return null;
        return {key, kind, grade, name:`${LOGIN_KINDS[kind]} (${gradeLabel(grade)})`, icon:kind==='box'?'🎁':kind.startsWith('rune_')?'✦':'🎟️', bound:true, usable:true,
            description:kind.startsWith('shadow_')?'Срок 7 дней начинается при выборе. Предмет нельзя передать, продать или улучшить.':'Привязан к персонажу. Используйте в календаре наград. Без срока хранения.'};
    }
    return null;
}
// UTC midnight is 03:00 in Moscow. No client clock or timezone participates in claims.
export function loginPeriod(now = Date.now()) {
    const date = new Date(now), year = date.getUTCFullYear(), month = date.getUTCMonth();
    return {month:`${year}-${String(month+1).padStart(2,'0')}`, day:date.getUTCDate(),
        days:new Date(Date.UTC(year,month+1,0)).getUTCDate(), firstWeekday:(new Date(Date.UTC(year,month,1)).getUTCDay()+6)%7,
        nextResetAt:Date.UTC(year,month,date.getUTCDate()+1), startsAt:Date.UTC(year,month,1)};
}
export function activeLoginRune(session, kind, now = Date.now()) {
    return Number(session?.game?.loginRewards?.runes?.[kind]) > now;
}
