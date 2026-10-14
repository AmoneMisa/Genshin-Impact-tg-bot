import {pathToFileURL as u} from 'node:url';const R=process.cwd().split(String.fromCharCode(92)).join('/')+'/';
const T=(await import(u(R+'template/buildsTemplate.js').href)).default;
const inc=(await import(u(R+'functions/game/builds/calculateIncreaseInResourceExtraction.js').href)).default;
const cost=(await import(u(R+'functions/game/builds/calculateUpgradeCosts.js').href)).default;
const names=['goldMine','crystalLake','ironDeposit','traineeArea','palace','forge','academy'];
const tot={};
for(const k of names){let g=0,o=0,d=0;for(let L=2;L<=30;L++){const c=cost(T[k].upgradeCosts,L,T[k].upgradeCostGrowth);g+=c.gold;o+=c.ironOre;d+=c.moonDew??0}tot[k]={g,o,d}}
console.table(tot);
const S={g:0,o:0,d:0};for(const k of names)for(const x of ['g','o','d'])S[x]+=tot[k][x];console.log('TOTAL to max all',S);
// passive-only sim, daily single collect, greedy by lowest ratio need; ignoring prerequisites & upgrade time
const lvl=Object.fromEntries(names.map(n=>[n,1]));
let gold=0,ore=0,dew=0,day=0;const done={};
const yieldPerDay=(k,h=24)=>Math.ceil(T[k].productionPerHour*(lvl[k]===1?1:inc(k,lvl[k])))*h;
const order=['ironDeposit','goldMine','crystalLake','palace','forge','academy','traineeArea'];
const milestones=[];
while(day<2000&&names.some(n=>lvl[n]<30)){day++;
 gold+=yieldPerDay('goldMine');dew+=yieldPerDay('crystalLake',Math.min(24,72));ore+=yieldPerDay('ironDeposit');
 let progressed=true;while(progressed){progressed=false;
  for(const k of order){if(lvl[k]>=30)continue;const c=cost(T[k].upgradeCosts,lvl[k]+1,T[k].upgradeCostGrowth);
   if(gold>=c.gold&&ore>=c.ironOre&&dew>=(c.moonDew||0)){gold-=c.gold;ore-=c.ironOre;dew-=c.moonDew||0;lvl[k]++;progressed=true;if(lvl[k]===30)done[k]=day;break}}}
 if(day%30===0)milestones.push(`day ${day}: ${names.map(n=>n.slice(0,5)+lvl[n]).join(' ')} | gold ${Math.round(gold)} ore ${Math.round(ore)} dew ${Math.round(dew)}`);}
console.log(milestones.join('\n'));console.log('L30 reached day:',done,'final day',day);
