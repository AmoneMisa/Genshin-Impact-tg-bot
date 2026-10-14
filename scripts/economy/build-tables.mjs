import {pathToFileURL as u} from 'node:url';const R=process.cwd().split(String.fromCharCode(92)).join('/')+'/';
const T=(await import(u(R+'template/buildsTemplate.js').href)).default;
const inc=(await import(u(R+'functions/game/builds/calculateIncreaseInResourceExtraction.js').href)).default;
const cost=(await import(u(R+'functions/game/builds/calculateUpgradeCosts.js').href)).default;
for(const [k,b] of Object.entries(T)){ if(!b.upgradeCosts) continue;
 console.log('\n##',k,b.name,'base/h',b.productionPerHour,'max',b.maxLvl,'seed costs',JSON.stringify(b.upgradeCosts.length));
 const rows=[];for(const L of [2,5,10,15,20,25,30]){let c;try{c=cost(b.upgradeCosts,L,b.upgradeCostGrowth)}catch(e){c=null}
  rows.push(`L${L}: cost gold ${c?.gold} ore ${c?.ironOre} dew ${c?.moonDew??c?.crystals}${b.productionPerHour?` | yield/h ${Math.ceil(b.productionPerHour*inc(k,L))}`:''}`)}
 console.log(rows.join('\n'));}
