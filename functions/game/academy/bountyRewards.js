import equipment from '../../../template/equipmentTemplate.js';
import {shotKey, SHOT_PACK_PRICE, SHOT_PACK, SHOTS_PER_CAST} from '../../../template/shotsData.js';
import {isMagicClass} from '../classes/classFamily.js';
import {crystalKey} from '../equipment/enchantItem.js';
import {levelNeed, EXP_RATE} from '../player/vitality.js';
import fields from '../../../template/huntingTemplate.js';
import {HUNT} from '../hunt/huntConfig.js';
import {spForLevelUp} from '../player/setLevel.js';
import {itemRow} from '../hunt/lootTable.js';

export const BOUNTY_CATEGORIES = Object.freeze(['experience', 'resources', 'consumables']);
export const BOUNTY_TITLES = Object.freeze({experience:'Опыт охотника', resources:'Запасы кузницы', consumables:'Боевой запас'});
export const bountyCrystalCount = (scope,quality) => Math.round(10+2.5*(Math.max(1,Math.min(5,Number(quality)||1))-1))*(scope==='week'?4:1);
const RESOURCES = {
  noGrade:[1864,1865,1869], D:[1870,1871,1872], C:[1880,1881,1882], B:[1873,1876,1877],
  A:[1888,1890,1894], S:[4039,4040,4041], S80:[1893,4039,4041], S84:[1892,1893,4041],
};
export function bountyGradeForLevel(level) {
  const lvl=Math.max(1,Math.min(85,Math.floor(Number(level)||1)));
  return equipment.grades.find(grade=>grade.lvl.from<=lvl&&lvl<=grade.lvl.to);
}
const median=values=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);return sorted.length?sorted[Math.floor(sorted.length/2)]:0;};
/** Ordinary, eligible mobs around the hero's level; excludes instance/champion multipliers. */
export function bountyHuntReference(level) {
  const grade=bountyGradeForLevel(level);
  const ordinary=fields.filter(zone=>!zone.instance).flatMap(zone=>zone.mobs);
  let mobs=ordinary.filter(m=>m.level>=grade.lvl.from&&Math.abs(m.level-level)<=2);
  if(!mobs.length){const gap=Math.min(...ordinary.filter(m=>m.level>=grade.lvl.from&&Math.abs(m.level-level)<=10).map(m=>Math.abs(m.level-level)));mobs=ordinary.filter(m=>m.level>=grade.lvl.from&&Math.abs(m.level-level)===gap);}
  return {
    gold:median(mobs.map(m=>m.gold?(m.gold.min+m.gold.max)/2*m.gold.chance/100*HUNT.goldScale:0)),
    exp:median(mobs.map(m=>m.expShare*levelNeed(m.level))),
    sp:median(mobs.map(m=>Math.max(1,Math.round(m.expShare*spForLevelUp(m.level))))),
  };
}
export const bountyDefaultTarget=(scope,quality)=>Math.round((scope==='week'?150:25)*(0.8+quality*0.35));
export function bountyExtras(scope, quality, level, category, className, target=bountyDefaultTarget(scope,quality)) {
  const grade=bountyGradeForLevel(level).name, weekly=scope==='week';
  const reference=bountyHuntReference(level),farmGold=reference.gold*target;
  // Targets already scale with quality. Do not multiply every currency by quality a second time.
  const capQuality=1+0.125*(quality-1);
  const exp=Math.floor(Math.min(reference.exp*target*(category==='experience'?0.3:0.05),levelNeed(level)*(category==='experience'?0.08:weekly?0.04:0.015)*capQuality/EXP_RATE));
  const materials={};
  if(category==='resources') {
    const budget=farmGold*0.2/RESOURCES[grade].length;
    for(const id of RESOURCES[grade]){
      const cost=Math.max(1,(itemRow(id)?.price||1)*HUNT.goldScale);
      // A useful partial stack, not a complete rare-material recipe each day.
      materials[`l2_${id}`]=Math.max(1,Math.min(weekly?12:4,Math.floor(budget/cost)));
    }
    if(grade!=='noGrade')materials[crystalKey(grade)]=bountyCrystalCount(scope,quality);
  }
  if(category==='consumables') {
    const kind=isMagicClass(className)?'spiritshot':'soulshot',perCast=SHOTS_PER_CAST[grade];
    const cost=SHOT_PACK_PRICE[grade]/SHOT_PACK;
    const casts=Math.max(weekly?9:3,Math.min(weekly?60:20,Math.floor(farmGold*0.25/cost/perCast)));
    materials[shotKey(kind,grade)]=casts*perCast;
  }
  return {gold:Math.max(1,Math.round(farmGold*(category==='experience'?0.15:0.1))),
    sp:Math.max(1,Math.round(Math.min(reference.sp*target*(category==='experience'?0.25:0.1),spForLevelUp(level)*(category==='experience'?0.25:0.1)*(1+0.25*(quality-1))*(weekly?3:1)))),exp,materials};
}
