import getCurrentCp from './getters/getCurrentCp.js';
import getMaxCp from './getters/getMaxCp.js';
import getCurrentHp from './getters/getCurrentHp.js';

// H5 snapshot 9fb01cb: items 5591/5592, skill 2166 levels 1/2.
export const CP_POTIONS = Object.freeze([
 {slot:'cp-small',id:'l2_5591',name:'CP Potion',type:'cp',power:50,icon:'icon-etc_cp_potion_i00',reuseMs:500},
 {slot:'cp',id:'l2_5592',name:'Greater CP Potion',type:'cp',power:200,icon:'icon-etc_cp_potion_i01',reuseMs:500},
]);
export function useCpPotion(session,id,now=Date.now()){
 const potion=CP_POTIONS.find(p=>p.id===id);
 if(!potion)return {ok:false,reason:'potion_not_found'};
 if(getCurrentHp(session)<=0)return {ok:false,reason:'player_dead'};
 const items=session.game.inventory?.materials;
 if(!(Number(items?.[id])>0))return {ok:false,reason:'potion_empty'};
 if((session.game.cpPotionAt?.[id]||0)>now)return {ok:false,reason:'cooldown'};
 const cp=getCurrentCp(session),max=getMaxCp(session);
 if(cp>=max)return {ok:false,reason:'cp_full'};
 // Original restrictions are checked server-side even for automatic use.
 if(session.game.world?.mode==='olympiad')return {ok:false,reason:'potion_restricted'};
 const restored=Math.min(potion.power,max-cp);
 session.game.gameClass.stats.cp=cp+restored;items[id]=Number(items[id])-1;
 (session.game.cpPotionAt||={})[id]=now+potion.reuseMs;
 return {ok:true,resource:'cp',restored,potion};
}
