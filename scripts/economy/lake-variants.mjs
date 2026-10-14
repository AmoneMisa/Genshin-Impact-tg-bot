import {pathToFileURL as u} from 'node:url';const R=process.cwd().split(String.fromCharCode(92)).join('/')+'/';
const T=(await import(u(R+'template/buildsTemplate.js').href)).default;
const inc=(await import(u(R+'functions/game/builds/calculateIncreaseInResourceExtraction.js').href)).default;
const cost=(await import(u(R+'functions/game/builds/calculateUpgradeCosts.js').href)).default;
const names=['goldMine','crystalLake','ironDeposit','traineeArea','palace','forge','academy'];
const lake={current:L=>L===1?50:Math.ceil(50*1.05*L*L),
 pow12:L=>Math.ceil(50*Math.pow(L,1.2)),
 H1:L=>Math.ceil(50*(1+0.15*(L-1))),
 linear5:L=>50*L};
for(const [vn,f] of Object.entries(lake)){
 const lvl=Object.fromEntries(names.map(n=>[n,1]));let gold=0,ore=0,dew=0,day=0,minDewShort=0,dewProduced=0,dewSpent=0;
 const order=['ironDeposit','goldMine','crystalLake','palace','forge','academy','traineeArea'];const done={};let stall=0;
 const y=(k,h=24)=>k==='crystalLake'?f(lvl[k])*h:Math.ceil(T[k].productionPerHour*(lvl[k]===1?1:inc(k,lvl[k])))*h;
 while(day<1500&&names.some(n=>lvl[n]<30)){day++;
  gold+=y('goldMine');const dd=y('crystalLake');dew+=dd;dewProduced+=dd;ore+=y('ironDeposit');
  let p=true;while(p){p=false;for(const k of order){if(lvl[k]>=30)continue;const c=cost(T[k].upgradeCosts,lvl[k]+1,T[k].upgradeCostGrowth);
   if(gold>=c.gold&&ore>=c.ironOre&&dew>=(c.moonDew||0)){gold-=c.gold;ore-=c.ironOre;dew-=c.moonDew||0;dewSpent+=c.moonDew||0;lvl[k]++;p=true;if(lvl[k]===30)done[k]=day;break}}}}
 console.log(vn.padEnd(8),'L30 lake/h',f(30),'| forge L30 day',done.forge,'| all done day',day,'| dew produced',dewProduced,'spent',dewSpent,'unused',Math.round(100*dew/dewProduced)+'%','| done',JSON.stringify(done));
}
// dew-bound check: what lake yield makes dew the limiting resource at some point?
