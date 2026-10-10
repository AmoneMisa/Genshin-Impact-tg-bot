export const SOUL_COLORS=Object.freeze({red:'Красный',green:'Зелёный',blue:'Синий'});
export const SOUL_MAX_STAGE=17;
export const soulCrystalKey=(color,stage)=>`soul_${color}_${stage}`;
export const SOUL_GOLD_PRICES=Object.freeze([1000,3000,6000,12000,24000,40000,60000,90000,140000,220000,340000,500000,750000,1200000]);
// 14 costs one Baium reward, 17 is below the 120 COL epic weapon rental.
export const SOUL_COL_PRICES=Object.freeze({14:25,15:40,16:60,17:85});
export const SEAL_RATES=Object.freeze({blue:3,green:5,red:10});
export const SOUL_MATERIALS=Object.freeze(Object.entries(SOUL_COLORS).flatMap(([color,label])=>Array.from({length:18},(_,stage)=>({key:soulCrystalKey(color,stage),name:`${label} кристалл души · ступень ${stage}`,icon:'💎',description:'Кристалл для SA оружия. Цвет и ступень должны точно соответствовать выбранной способности.'}))).concat(Object.entries(SEAL_RATES).map(([color,rate])=>({key:`seal_${color}`,name:`${SOUL_COLORS[color]} камень печати`,icon:'◆',description:`Добывается в катакомбах. Обмен: 1 камень = ${rate} древней адены.`}))));
