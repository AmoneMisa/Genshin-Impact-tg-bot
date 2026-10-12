// Lineage II buff concepts adapted to this game's stat scale; 20 minute duration.
export default [
 {id:'might',name:'Might Potion',description:'Физическая атака +15% на 20 минут.',modifiers:{attackMul:1.15}},
 {id:'shield',name:'Shield Potion',description:'Физическая защита +15% на 20 минут.',modifiers:{defenceMul:1.15}},
 {id:'haste',name:'Haste Potion',description:'Боевая скорость +20% на 20 минут.',modifiers:{speedMul:1.2}},
 {id:'focus',name:'Focus Potion',description:'Шанс критического удара +15 пунктов на 20 минут.',modifiers:{criticalChance:15}},
 {id:'death-whisper',name:'Death Whisper Potion',description:'Критический урон +20% на 20 минут (до общего предела).',modifiers:{criticalDamage:1.2}},
 {id:'guidance',name:'Guidance Potion',description:'Точность +10 на 20 минут.',modifiers:{accuracy:10}},
 {id:'wind-walk',name:'Wind Walk Potion',description:'Скорость +20 на 20 минут (до общего предела).',modifiers:{speed:20}},
 {id:'warrior-buff',name:'Бафф воина',donateOnly:true,seconds:7200,artKey:'potion-might',description:'На 2 часа: физическая атака +15%, физическая защита +15%, боевая скорость +20%, шанс крита +15, критический урон +20%, точность +10, скорость +20. Без песен и танцев. Не складывается с отдельными бафф-банками.',modifiers:{speedMul:1.2,criticalChance:15,criticalDamage:1.2,accuracy:10,speed:20},typedModifiers:{physical:{attackMul:1.15,defenceMul:1.15}}},
 {id:'mage-buff',name:'Бафф мага',donateOnly:true,seconds:7200,artKey:'potion-shield',description:'На 2 часа: магическая атака +75%, магическая защита +30%, физическая защита +15%, боевая скорость +30%, скорость +20. Без песен и танцев. Не складывается с отдельными бафф-банками.',modifiers:{speedMul:1.3,speed:20},typedModifiers:{magic:{attackMul:1.75,defenceMul:1.3},physical:{defenceMul:1.15}}},
].map(p=>({type:'buff',bottleType:'elixir',size:'small',count:0,power:0,seconds:1200,artKey:'potion-'+p.id,cost:12000,...p}));
