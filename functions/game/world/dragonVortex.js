import {DRAGON_VORTICES,DRAGON_VORTEX_ROLLS} from '../../../template/dragonVortex.js';
export {DRAGON_VORTICES};
export const isVortexBoss=id=>DRAGON_VORTEX_ROLLS.some(([npc])=>npc===Number(id));
export function rollVortexBoss(random=Math.random){
 const roll=Math.floor(random()*100);
 return DRAGON_VORTEX_ROLLS.find(([,limit])=>roll<limit)?.[0]||25718;
}
export function nearVortex(session,id){
 const w=session.game.world,f=session.game.hunt?.field,v=DRAGON_VORTICES.find(v=>v.id===String(id));
 return v&&w?.mode==='location'&&w.location==='dragon-valley'&&session.game.hunt.zone===w.location&&f?.floor===v.floor&&f.room===v.room&&Math.hypot(f.x-v.point.x,f.y-v.point.y)<=.1?v:null;
}
export function vortexMarkers(session){
 const f=session.game.hunt?.field;
 return session.game.hunt?.zone==='dragon-valley'?DRAGON_VORTICES.map(v=>({id:v.id,name:'Dragon Vortex',floor:v.floor,room:v.room,point:v.point,near:Boolean(nearVortex(session,v.id)),here:f?.floor===v.floor&&f.room===v.room})):[];
}
