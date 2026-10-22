import {getMaterialCount,spendMaterials} from '../player/materials.js';
import {WORLD_EXTENSION_LOCATIONS,WORLD_EXTENSION_LEVELS} from '../../../template/worldExtension.js';
export function regionAccessBlock(session,location,{linked=false,walking=false,now=Date.now()}={}){
 const rule=location?.access;
 if(rule?.kind==='walk-only'&&!walking)return 'city_route_unavailable';
 if(rule?.kind==='linked'&&!linked)return 'location_path_required';
 if(linked&&location.id==='tower-of-infinitum'){
  if(Number(session.ownerDocument?.()?.game?.hellbound?.level||0)<11)return 'hellbound_stage_required';
  if(!session.game.effects?.some(e=>Number(e.l2SkillId)===2357&&e.until>now))return 'hellbound_pass_required';
 }
 if(rule?.minLevel&&Number(session.game.stats?.lvl)<rule.minLevel)return 'instance_level';
 if(location?.continent==='gracia'){
  const w=session.game.world;
  if(w?.city!=='keucereus-alliance-base'&&!WORLD_EXTENSION_LOCATIONS.some(l=>l.id===w?.location&&l.continent==='gracia'))return 'gracia_route_required';
 }
 if(!walking&&location?.entrySource?.type?.startsWith('NOBLES')&&!session.game.isNoble)return 'noblesse_required';
 const fare=location?.entryFare;
 return !walking&&fare&&fare.item!==57&&getMaterialCount(session,'l2_'+fare.item)<fare.count?'entry_material_required':null;
}
export function spendRegionFare(session,location){
 const fare=location?.entryFare;
 return !fare||fare.item===57||spendMaterials(session,{['l2_'+fare.item]:fare.count});
}
export function regionLinks(id,field){
 const last=WORLD_EXTENSION_LEVELS[id]?.floors.at(-1);if(last&&field.floor!==last.number)return [];
 const room=last?.rooms.at(-1)?.id||(id==='hellbound'?'r1c0':'r2c3');
 return WORLD_EXTENSION_LOCATIONS.filter(l=>l.access?.kind==='linked'&&l.access.from===id).map(l=>({location:l.id,title:l.name,room,point:{x:.9,y:.1},near:(!last||field.floor===last.number)&&field.room===room&&Math.hypot(field.x-.9,field.y-.1)<=.1}));
}
