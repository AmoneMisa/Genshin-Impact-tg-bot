import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {LOCATION_LEVELS} from '../../template/locationLevels.js';
import {LOCATIONS} from '../../template/worldMap.js';

import routes from '../../template/nativeRoutes.js';
import pilot from '../../template/nativeFieldPilot.js';
import {worldGeodata} from '../../functions/game/world/l2jGeodata.js';
import {findNativePath,nativeSegment} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';
import {nativeInteriorCandidates} from './native-interior-candidates.mjs';
const file='template/nativeInteriorRoutes.js',previous=fs.existsSync(file)?(await import(new URL('../../template/nativeInteriorRoutes.js',import.meta.url))).default:null;
const barriersSha256=createHash('sha256').update(fs.readFileSync('template/nativeWorld.js')).digest('hex');
const requested=process.argv.slice(2),ids=requested.length?requested:['stakato-nest'],compiled={...previous?.routes};
for(const id of ids){
 const entry=LOCATIONS.find(l=>l.id===id),route=routes.routes[id],model=LOCATION_LEVELS[id];
 if(!entry?.entrySource||!route?.available||!route.returnPath||(model.floors.length!==1&&!pilot.fields[id]?.floors))throw Error('Unverified single-floor approach: '+id);
 if(routes.geodataCommit!==worldGeodata.manifest.commit||routes.barriersSha256!==barriersSha256)throw Error('Stale outside route');
 const candidates=nativeInteriorCandidates(id,model.floors[0],entry);
 let result=null;
 for(const source of candidates){
  const plan=findNativePath(route.to,source.point,{allowed:nativeGroundAllowed,stride:4,maxNodes:120000,margin:1024,heuristicWeight:2,reversible:true});
  if(!plan.ok||plan.path.length>128)continue;
  const vertices=[plan.start,...plan.path],returnPath=vertices.slice(0,-1).reverse();let before=vertices.at(-1);
  for(const p of returnPath){if(!nativeSegment(before,p,{allowed:nativeGroundAllowed,reversible:true}))throw Error('Invalid cave return');before=p;}
  result={from:plan.start,to:vertices.at(-1),path:plan.path,returnPath,sourceEntry:entry.entrySource,sourceSpawn:source.source,visited:plan.visited};break;
 }
 if(!result)throw Error('No reversible cave approach: '+id);
 compiled[id]=result;console.log(id,result.path.length+' cave segments',result.visited+' search nodes');
}
fs.writeFileSync(file,'// Derived from L2J High Five geodata (GPL-3.0); see data/l2j-geodata/LICENSE.\n// Checked ground approaches to source NPCs or explicitly derived territory witnesses.\n// These are derived walking routes, never teleport destinations.\nexport default '+JSON.stringify({geodataCommit:worldGeodata.manifest.commit,barriersSha256,routes:compiled},null,2)+';\n');
