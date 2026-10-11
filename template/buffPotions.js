// Lineage II buff concepts adapted to this game's stat scale; 20 minute duration.
export default [
 {id:'might',name:'Might Potion',description:'Физическая атака +15% на 20 минут.',modifiers:{attackMul:1.15}},
 {id:'shield',name:'Shield Potion',description:'Защита +15% на 20 минут.',modifiers:{defenceMul:1.15}},
 {id:'haste',name:'Haste Potion',description:'Боевая скорость +20% на 20 минут.',modifiers:{speedMul:1.2}},
 {id:'focus',name:'Focus Potion',description:'Шанс критического удара +15 пунктов на 20 минут.',modifiers:{criticalChance:15}},
 {id:'death-whisper',name:'Death Whisper Potion',description:'Критический урон +20% на 20 минут (до общего предела).',modifiers:{criticalDamage:1.2}},
 {id:'guidance',name:'Guidance Potion',description:'Точность +10 на 20 минут.',modifiers:{accuracy:10}},
 {id:'wind-walk',name:'Wind Walk Potion',description:'Скорость +20 на 20 минут (до общего предела).',modifiers:{speed:20}},
].map(p=>({...p,type:'buff',bottleType:'elixir',size:'small',count:0,power:0,seconds:1200,artKey:'potion-'+p.id,cost:12000}));
