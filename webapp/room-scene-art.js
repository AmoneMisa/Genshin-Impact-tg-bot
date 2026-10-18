// Original environment paintings, not client geodata or item art.
import {sceneStudy,sceneStudyUrl} from './scene-catalog.js';
import {FLOOR_SCENES} from './scene-level-catalog.js';
export const ROOM_SCENES=['catacomb','necropolis','woodland','marsh','springs','volcanic','desert','cavern','ship','ice'];
// Original-location studies override the broad theme without changing other zones.
const locationScenes={
 'blazing-swamp':{name:'blazing-swamp',version:2},
 'hot-springs':{name:'hot-springs',version:2},
 'outlaw-forest':{name:'outlaw-forest',version:2},
 'wall-of-argos':{name:'wall-of-argos',version:2},
};
export function roomSceneUrl(environment,{compact=false,sceneKey=''}={}){
 if(!ROOM_SCENES.includes(environment))return null;
 const [id,,area]=String(sceneKey).split(':'),variant=/^area-([12])$/.exec(area||'');
 const floor=/^floor-(\d+)$/.exec(area||'');
 if(floor&&Object.hasOwn(FLOOR_SCENES,id)){
  const asset=FLOOR_SCENES[id][Number(floor[1])-1];
  if(asset)return `/art/world/scenes/${asset}${compact?'-mobile':''}-v1.webp`;
 }
 if(variant&&(Object.hasOwn(locationScenes,id)||(sceneStudy(id)?.category==='hunting'&&sceneStudy(id)?.sections!==1)))return `/art/world/scenes/${id}-area-${variant[1]}${compact?'-mobile':''}-v${id==='plains-of-dion'&&variant[1]==='1'?2:1}.webp`;
 const study=sceneStudyUrl(String(sceneKey).split(':')[0],{compact});
 if(study)return study;
 const scene=Object.hasOwn(locationScenes,id)?locationScenes[id]:{name:environment,version:1};
 return `/art/world/scenes/${scene.name}${compact?'-mobile':''}-v${scene.version}.webp`;
}
const cache=new Map();
/** Presentation only: keep collision footprints and the authoritative field untouched. */
export function roomArtField(field){
 const study=sceneStudy(String(field.sceneKey||'').split(':')[0]);if(!study)return field;
 const environment=/:floor-\d+$/.test(field.sceneKey||'')?field.environment:study.environment,indoor=['catacomb','necropolis','ship','ice'].includes(environment);
 return {...field,environment,walls:(field.walls||[]).map(w=>w.kind==='tree'&&environment!=='woodland'&&environment!=='marsh'?{...w,kind:indoor?'pillar':'rock'}:w)};
}
// Keep only two decoded backgrounds. Each room uploads a bounded static canvas once.
export function loadRoomScene(environment,options={}){
 const url=roomSceneUrl(environment,options);if(!url)return Promise.resolve(null);
 if(cache.has(url)){
  const entry=cache.get(url);cache.delete(url);cache.set(url,entry);return entry.pending;
 }
 const entry={image:null,pending:null};cache.set(url,entry);
 entry.pending=new Promise(resolve=>{
  const image=new Image();let finished=false;
  const finish=value=>{if(finished)return;finished=true;clearTimeout(timer);image.onload=image.onerror=null;entry.image=value;resolve(value);};
  const timer=setTimeout(()=>finish(null),5000);
  image.onload=()=>finish(image);image.onerror=()=>finish(null);image.src=url;
 });
 while(cache.size>2)cache.delete(cache.keys().next().value);
 return entry.pending;
}
export const paintedRoomScene=(environment,options={})=>cache.get(roomSceneUrl(environment,options))?.image||null;
