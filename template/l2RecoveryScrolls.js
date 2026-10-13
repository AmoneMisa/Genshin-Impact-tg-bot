// High Five item IDs, grade ranges and original shop prices.
export const RECOVERY_SCROLLS=[
 {id:8594,min:1,max:19,grade:'NG',price:2000},{id:8595,min:20,max:39,grade:'D',price:4800},
 {id:8596,min:40,max:51,grade:'C',price:14000},{id:8597,min:52,max:60,grade:'B',price:28000},
 {id:8598,min:61,max:75,grade:'A',price:48000},{id:8599,min:76,max:85,grade:'S',price:80000},
];
export function recoveryInfo(id){const s=RECOVERY_SCROLLS.find(s=>s.id===Number(id));return s?{...s,key:'l2_'+s.id,name:'Свиток восстановления ('+s.grade+')',description:'Снимает один уровень штрафа за смерть. Для уровней '+s.min+'–'+s.max+'.',kind:'consumable',type:'EtcItem',etc:'SCROLL'}:null;}
