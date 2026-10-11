import equipment from '../../../template/equipmentTemplate.js';
import {shotKey} from '../../../template/shotsData.js';
import {isMagicClass} from '../classes/classFamily.js';
import {scrollKey, crystalKey} from '../equipment/enchantItem.js';
import {levelNeed, EXP_RATE} from '../player/vitality.js';

export const BOUNTY_CATEGORIES = Object.freeze(['experience', 'resources', 'consumables']);
export const BOUNTY_TITLES = Object.freeze({experience:'Опыт и ОП', resources:'Ресурсы для крафта', consumables:'Боевые расходники'});
const RESOURCES = {
  noGrade:[1864,1865,1869], D:[1870,1871,1872], C:[1880,1881,1882], B:[1873,1876,1877],
  A:[1888,1890,1894], S:[4039,4040,4041], S80:[1893,4039,4041], S84:[1892,1893,4041],
};
export function bountyGradeForLevel(level) {
  const lvl=Math.max(1,Math.min(85,Math.floor(Number(level)||1)));
  return equipment.grades.find(grade=>grade.lvl.from<=lvl&&lvl<=grade.lvl.to);
}
export function bountyExtras(scope, quality, level, category, className) {
  const grade=bountyGradeForLevel(level).name, weekly=scope==='week', multiplier=weekly?4:1;
  const expShare=(category==='experience'?0.15:0.03)*(weekly?3:1)*(1+0.15*(quality-1));
  const exp=Math.ceil(levelNeed(level)*expShare/EXP_RATE);
  const materials={};
  if(category==='resources') {
    const index=equipment.grades.findIndex(row=>row.name===grade);
    const count=Math.max(1,5-index)*quality*multiplier;
    for(const id of RESOURCES[grade])materials[`l2_${id}`]=count;
    if(grade!=='noGrade')materials[crystalKey(grade)]=quality*multiplier;
  }
  if(category==='consumables') {
    const kind=isMagicClass(className)?(weekly?'blessed':'spiritshot'):'soulshot';
    materials[shotKey(kind,grade)]=100*quality*multiplier;
    if(grade!=='noGrade')materials[scrollKey(grade)]=weekly?2:1;
  }
  return {exp,materials};
}
