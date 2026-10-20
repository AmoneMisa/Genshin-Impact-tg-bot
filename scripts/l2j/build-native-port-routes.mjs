import fs from 'node:fs';
import {createHash} from 'node:crypto';
import data from '../../template/ferryData.js';
import {worldGeodata as geo} from '../../functions/game/world/l2jGeodata.js';
import {nativeTownHub} from '../../functions/game/world/nativeTownGraph.js';
import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';
import {findNativePath,nativeSegment} from '../../functions/game/world/nativeNavigation.js';
const routes={};
for(const port of Object.values(data.ports)){
 const approach=findNativePath(nativeTownHub(port.city),port.vendor,{allowed:nativeGroundAllowed,maxNodes:120000,stride:4,heuristicWeight:2,margin:512,reversible:true});
 if(!approach.ok)throw new Error(port.id+': no verified vendor approach');
 // Find a walkable shore point within the source vehicle boarding sphere. These
 // are derived path endpoints, never original NPC spawns or fictitious TownZones.
 const candidates=[];
 for(let dx=-960;dx<=960;dx+=64)for(let dy=-960;dy<=960;dy+=64){const p=geo.point({x:port.dock.x+dx,y:port.dock.y+dy,z:port.dock.z});if(p?.nswe&&nativeGroundAllowed(p)&&Math.hypot(dx,dy,p.z-port.dock.z)<=data.source.boardingRadius)candidates.push(p);}
 candidates.sort((a,b)=>Math.hypot(a.x-port.vendor.x,a.y-port.vendor.y)-Math.hypot(b.x-port.vendor.x,b.y-port.vendor.y));
 let boarding;for(const p of candidates.slice(0,16)){const plan=findNativePath(port.vendor,p,{allowed:nativeGroundAllowed,maxNodes:20000,stride:2,heuristicWeight:2,reversible:true});if(plan.ok){boarding=plan;break;}}
 if(!boarding)throw new Error(port.id+': no verified boarding approach');
 const clean=p=>({x:p.x,y:p.y,z:p.z}),path=[...approach.path,...boarding.path].map(clean),from=clean(approach.start),to=path.at(-1);
 let at=from;for(const p of path){if(!nativeSegment(at,p,{allowed:nativeGroundAllowed,reversible:true}))throw new Error('Invalid shore segment');at=p;}
 routes[port.id]={city:port.city,from,to,vendor:clean(approach.path.at(-1)),vendorIndex:approach.path.length,boardingGeometry:'derived-native-shore',path,returnPath:[from,...path.slice(0,-1)].reverse()};
 console.log(port.id,port.ticketPrice,'adena',path.length,'verified waypoints');
}
fs.writeFileSync('template/nativePortRoutes.js','// Derived native shore paths, verified in both directions; no authored spawn points.\n// L2J High Five geodata (GPL-3.0); see data/l2j-geodata/LICENSE.\nexport default '+JSON.stringify({geodataCommit:geo.manifest.commit,worldCommit:data.source.commit,barriersSha256:createHash('sha256').update(fs.readFileSync('template/nativeWorld.js')).digest('hex'),routes},null,2)+';\n');
