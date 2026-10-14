import {pathToFileURL as u} from 'node:url';const R=process.cwd().split(String.fromCharCode(92)).join('/')+'/';
const L=await import(u(R+'functions/game/hunt/lootTable.js').href);
const F=(await import(u(R+'template/huntingTemplate.js').href)).default;
const sd=await import(u(R+'template/shotsData.js').href);
const {HUNT}=await import(u(R+'functions/game/hunt/huntConfig.js').href);
const grade=l=>l<20?'noGrade':l<40?'D':l<52?'C':l<61?'B':l<76?'A':l<80?'S':l<84?'S80':'S84';
let rows=[];
for(const z of F){const mobs=z.mobs;if(!mobs.length)continue;
 let g=0,d=0,lv=0,n=0;
 for(const m of mobs){n++;lv+=m.level;
  if(m.gold)g+=m.gold.chance/100*(m.gold.min+m.gold.max)/2*HUNT.goldScale;
  for(const r of L.lootRows(m.id)){const p=L.l2SellPrice(r.key,HUNT.goldScale);if(!p)continue;
   d+=(r.chance/100)*(r.kind==='seal'?1:HUNT.dropRate)*(r.min+r.max)/2*p;}}
 lv/=n;g/=n;d/=n;const gr=grade(lv);const cg=sd.chargeGrade(gr),shot=sd.SHOT_PACK_PRICE[cg]/sd.SHOT_PACK;
 rows.push({id:z.id,lv:Math.round(lv),gr,gold:Math.round(g),drops:Math.round(d),perShot:shot,shotsCast:sd.SHOTS_PER_CAST[cg]});}
rows.sort((a,b)=>a.lv-b.lv);
console.log('zone|lvl|grade|adena/kill|drop sell/kill|total|shot cost per cast|casts for break-even');
for(const r of rows){const t=r.gold+r.drops;const cc=r.perShot*r.shotsCast;console.log([r.id,r.lv,r.gr,r.gold,r.drops,t,cc.toFixed(1),(t/cc).toFixed(1)].join('|'));}
