import fs from 'node:fs';import {createHash} from 'node:crypto';
import {LOCATION_LEVELS} from '../../template/locationLevels.js';import pilot from '../../template/nativeFieldPilot.js';import approaches from '../../template/nativeInteriorRoutes.js';
import {findNativePath,nativeSegment} from '../../functions/game/world/nativeNavigation.js';import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';import {worldGeodata} from '../../functions/game/world/l2jGeodata.js';
import {nativeInteriorCandidates} from './native-interior-candidates.mjs';
const file='template/nativeLevelRoutes.js',previous=fs.existsSync(file)?(await import(new URL('../../template/nativeLevelRoutes.js',import.meta.url))).default:null,zones={...previous?.zones};
for(const id of process.argv.slice(2).length?process.argv.slice(2):['forge-of-the-gods']){
 const root=approaches.routes[id];if(!root||!pilot.fields[id]?.floors)throw Error('Missing cave approach or reviewed floors');
 const levels={};
 for(const floor of pilot.fields[id].floors){
  const model=LOCATION_LEVELS[id].floors.find(f=>f.number===floor),candidates=nativeInteriorCandidates(id,model,root.to);
  if(floor===1){levels[floor]={title:model.title,to:root.to,path:[],source:root.sourceSpawn};continue;}
  let result;
  for(const source of candidates){
   const plan=findNativePath(root.to,source.point,{allowed:nativeGroundAllowed,stride:4,maxNodes:200000,margin:2048,heuristicWeight:2,reversible:true});
   if(!plan.ok||plan.path.length>128)continue;
   let before=plan.start;for(const p of plan.path){if(!nativeSegment(before,p,{allowed:nativeGroundAllowed,reversible:true}))throw Error('Invalid level route');before=p;}
   result={title:model.title,to:plan.path.at(-1),path:plan.path,source:source.source,visited:plan.visited};break;
  }
  if(!result)throw Error('No reversible level path: '+id+' '+floor);levels[floor]=result;
 }
 zones[id]={root:root.to,levels};console.log(id,Object.keys(levels).length+' connected native levels');
}
fs.writeFileSync(file,'// Derived from L2J High Five geodata (GPL-3.0); see data/l2j-geodata/LICENSE.\n// Derived physical level routes. Endpoints are pinned NPCs or explicitly derived territory witnesses; no authored stair teleport.\nexport default '+JSON.stringify({geodataCommit:worldGeodata.manifest.commit,barriersSha256:createHash('sha256').update(fs.readFileSync('template/nativeWorld.js')).digest('hex'),zones},null,2)+';\n');
