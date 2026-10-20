import fs from 'node:fs';
import entries from '../../template/nativeIslandEntries.js';
import ports from '../../template/ferryData.js';
import {worldGeodata as geo} from '../../functions/game/world/l2jGeodata.js';
import {findNativePath,nativeSegment} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';
const routes={};
for(const [id,entry] of Object.entries(entries)){
 const port=Object.values(ports.ports).find(p=>p.island===id);if(!port)throw new Error('Missing island shore');
 const plan=findNativePath(port.vendor,entry,{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true});
 if(!plan.ok)throw new Error(id+': '+plan.reason);
 const clean=p=>({x:p.x,y:p.y,z:p.z}),vertices=[plan.start,...plan.path].map(clean);let distance=0;
 for(let i=1;i<vertices.length;i++){if(!nativeSegment(vertices[i-1],vertices[i],{allowed:nativeGroundAllowed,reversible:true}))throw new Error('Invalid island segment');distance+=Math.hypot(vertices[i].x-vertices[i-1].x,vertices[i].y-vertices[i-1].y);}
 routes[id]={available:true,island:id,isolatedPort:port.id,city:port.city,from:vertices[0],to:vertices.at(-1),path:vertices.slice(1),returnPath:vertices.slice(0,-1).reverse(),distance,sourceEntry:entry.entrySource};
 console.log(id,vertices.length-1,'verified source shore/field segments');
}
fs.writeFileSync('template/nativeIslandRoutes.js','// Separate island shores: these paths never imply a mainland ground connection.\n// L2J High Five geodata (GPL-3.0); see data/l2j-geodata/LICENSE.\nexport default '+JSON.stringify({geodataCommit:geo.manifest.commit,worldCommit:ports.source.commit,routes},null,2)+';\n');
