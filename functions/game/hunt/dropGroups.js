import {LOOT_KINDS} from './lootTable.js';

/** Display categories over the actual rolls, not reconstructed native drop groups.
 * Rolls are independent except rows with the same rollGroup (exclusive outcomes).
 * P(item | at least one category item) = P(item) / P(category).
 */
export function huntDropGroups(drops=[]){
 const kinds=[{id:'gold',label:'Адена'},...LOOT_KINDS];
 return kinds.flatMap(({id,label})=>{
  const rows=drops.filter(d=>(d.kind||'other')===id);if(!rows.length)return [];
  const events=new Map();
  rows.forEach((d,i)=>{
   const key=d.rollGroup||`row:${i}`,chance=Math.max(0,Math.min(100,Number(d.chance)||0))/100;
   events.set(key,Math.min(1,(events.get(key)||0)+chance));
  });
  const probability=Math.max(0,-Math.expm1([...events.values()].reduce((sum,p)=>sum+Math.log1p(-p),0)));
  return [{id,label,chance:probability*100,items:rows.map(d=>{
   const chance=Math.max(0,Math.min(100,Number(d.chance)||0));
   return {...d,min:d.min*Math.max(1,Math.floor(d.chance/100)),max:d.max*Math.max(1,Math.ceil(d.chance/100)),chance,withinGroupChance:probability>0?chance/probability:0};
  })}];
 });
}
