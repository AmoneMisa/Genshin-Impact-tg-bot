import {MISSING_WORLD_SOURCE} from '../../docs/missing-world-sources.js';
import {nativeTerritorySource,sampleNativeTerritory} from '../../functions/game/world/nativeSpawnTerritory.js';
import landmarks from '../../template/nativeInteriorLandmarks.js';

/** Offline witnesses only: fixed source NPCs or reproducible original placement
 * proposals. A sampled witness is neither an original entrance nor a fixed NPC. */
export function nativeInteriorCandidates(id,model,from){
 const landmark=landmarks.zones[id]?.[model.number],candidates=landmark?[landmark]:[],areas=new Set();
 for(const slot of model.rooms.flatMap(r=>r.spawns||[])){
  const file=slot.file||slot.sourceFile,sha256=MISSING_WORLD_SOURCE.files[file];
  if(!sha256)throw Error('Missing pinned interior provenance: '+file);
  const provenance={file,sha256,commit:MISSING_WORLD_SOURCE.commit};
  if(slot.coordinateSource==='point'){
   candidates.push({point:slot,source:{id:slot.id,x:slot.x,y:slot.y,z:slot.z,...provenance}});continue;
  }
  const key=file+':'+slot.sourceGroup;if(areas.has(key))continue;areas.add(key);
  const territory=nativeTerritorySource(id,slot);
  for(const seed of [42,111,333,777]){
   let state=seed;const point=sampleNativeTerritory(territory,{random:()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)});
   // Floor waypoints must be inside the source interval, even though the H5
   // population sampler can legitimately select a lower layer below minZ.
   if(!point||point.z<slot.minZ)continue;
   candidates.push({point,source:{type:'TERRITORY_SAMPLE',originalEntrance:null,sourceGroup:slot.sourceGroup,polygon:slot.polygon,minZ:slot.minZ,maxZ:slot.maxZ,seed,point,...provenance}});
  }
 }
 return candidates.sort((a,b)=>Math.hypot(a.point.x-from.x,a.point.y-from.y)-Math.hypot(b.point.x-from.x,b.point.y-from.y)).slice(0,8);
}
