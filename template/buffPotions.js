// Lineage II buff concepts adapted to this game's stat scale; 20 minute duration.
export default [
 {id:'might',name:'Зелье Might',description:'Физическая атака +15% на 20 минут.',modifiers:{attackMul:1.15}},
 {id:'shield',name:'Зелье Shield',description:'Защита +15% на 20 минут.',modifiers:{defenceMul:1.15}},
 {id:'haste',name:'Зелье Haste',description:'Боевая скорость +20% на 20 минут.',modifiers:{speedMul:1.2}},
 {id:'focus',name:'Зелье Focus',description:'Шанс критического удара +15 пунктов на 20 минут.',modifiers:{criticalChance:15}},
 {id:'death-whisper',name:'Зелье Death Whisper',description:'Критический урон +20% на 20 минут (до общего предела).',modifiers:{criticalDamage:1.2}},
 {id:'guidance',name:'Зелье Guidance',description:'Точность +10 на 20 минут.',modifiers:{accuracy:10}},
 {id:'wind-walk',name:'Зелье Wind Walk',description:'Скорость +20 на 20 минут (до общего предела).',modifiers:{speed:20}},
].map(p=>({...p,type:'buff',bottleType:'elixir',size:'small',count:0,power:0,seconds:1200,artKey:'potion-'+p.id,cost:12000}));
