import {sampleNativeTerritory,nativeTerritorySource} from '../../functions/game/world/nativeSpawnTerritory.js';
import {pointInPolygon} from '../../functions/game/world/navigation.js';
import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';
import {nativeFieldRooms} from '../../functions/game/world/nativeFieldRooms.js';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {LOCATIONS} from '../../template/worldMap.js';
import {MISSING_WORLD_SOURCE} from '../../docs/missing-world-sources.js';
import approaches from '../../template/nativeInteriorRoutes.js';
import landmarks from '../../template/nativeInteriorLandmarks.js';
import pilot from '../../template/nativeFieldPilot.js';
import church from '../../template/paganChurchRoute.js';
import {geoCell,geoRegionId,worldGeodata} from '../../functions/game/world/l2jGeodata.js';
import {nativeStep} from '../../functions/game/world/nativeNavigation.js';
const file='template/nativeInteriorMaps.js',previous=fs.existsSync(file)?(await import(new URL('../../template/nativeInteriorMaps.js',import.meta.url))).default:null;
const requested=process.argv.slice(2),ids=requested.length?requested:['antharas-lair','stakato-nest'],maps={...previous?.maps};
const requests=ids.flatMap(id=>[{id,key:id},...(pilot.fields[id]?.separateLandingMaps?pilot.fields[id].cityLandings:pilot.fields[id]?.separateFloorMaps?Object.keys(landmarks.zones[id]||{}).filter(floor=>Number.isInteger(Number(floor))):[]).map(floor=>({id,key:id+':f'+floor,sourceFloor:Number(floor)}))]);
for(const {id,key,sourceFloor} of requests){
 const dungeon=pilot.fields[id]?.dungeon||pilot.fields[id]?.detachedInterior;
 const landing=pilot.fields[id]?.cityLandings?.includes(sourceFloor);
 const allSlots=nativeFieldRooms(id).flatMap(r=>r.spawns||[]),allMarkers=Object.entries(landmarks.zones[id]||{}).filter(([floor])=>(!dungeon||floor!=='entrance')&&(landing?Number(floor)===sourceFloor:!pilot.fields[id]?.cityLandings?.includes(Number(floor)))).map(([,m])=>m);
 const slots=nativeFieldRooms(id).filter(r=>!sourceFloor||r.sourceFloor===sourceFloor).flatMap(r=>r.spawns||[]),fixed=slots.filter(s=>s.coordinateSource==='point'),areas=slots.filter(s=>s.coordinateSource!=='point');
 const markers=sourceFloor?[landmarks.zones[id][sourceFloor]]:allMarkers;
 const files=Object.fromEntries([...new Set([...slots.map(s=>s.file||s.sourceFile),...markers.map(m=>m.source.file)])].map(f=>{const sha=MISSING_WORLD_SOURCE.files[f]||pilot.source.files[f];if(!sha)throw Error('Missing source provenance');return [f,sha];}));
 const footprint=id==='pagan-temple'&&landing?church.presentationBounds[sourceFloor]:null;
 const anchors=footprint?[{x:footprint.x,y:footprint.y},{x:footprint.x+footprint.w,y:footprint.y+footprint.h}]:[...allSlots.filter(s=>s.coordinateSource==='point'),...allMarkers.map(m=>m.point),...allSlots.filter(s=>s.coordinateSource!=='point').flatMap(s=>s.polygon.map(([x,y])=>({x,y}))),...(dungeon?[]:[LOCATIONS.find(l=>l.id===id)]),...(approaches.routes[id]?.path||[])];
 // Presentation crop only. It never participates in movement or placement.
 const left=geoCell(Math.min(...anchors.map(s=>s.x)))-16,top=geoCell(Math.min(...anchors.map(s=>s.y)))-16,right=geoCell(Math.max(...anchors.map(s=>s.x)))+16,bottom=geoCell(Math.max(...anchors.map(s=>s.y)))+16;
 const width=right-left+1,height=bottom-top+1,roof=new Int16Array(width*height);roof.fill(32767);
 const index=(x,y)=>(x-left)*height+y-top,inside=n=>n.gx>=left&&n.gx<=right&&n.gy>=top&&n.gy<=bottom;
 const covered=n=>{const i=index(n.gx,n.gy);if(roof[i]===32767)roof[i]=worldGeodata.cell(n.gx,n.gy,32767)?.z??-32768;return roof[i]>n.z;};
 const queue=[],seen=new Set(),mask=new Set();
 function add(n){if(!n?.nswe||!inside(n)||!covered(n))return;const i=index(n.gx,n.gy),key=i+':'+n.z;if(seen.has(key))return;seen.add(key);mask.add(i);queue.push(n);if(seen.size>1500000)throw Error('Cave footprint node budget');}
 for(const s of [...fixed,...markers.map(m=>m.point),...(id==='pagan-temple'&&landing?church.floorSeeds[sourceFloor]:[])])add({gx:geoCell(s.x),gy:geoCell(s.y),...worldGeodata.point(s)});
 const territories=new Set();
 for(const area of areas){
  const key=(area.file||area.sourceFile)+':'+area.sourceGroup;if(territories.has(key))continue;territories.add(key);
  const territory=nativeTerritorySource(id,area),xs=area.polygon.map(p=>p[0]),ys=area.polygon.map(p=>p[1]),middle=Math.trunc((area.minZ+area.maxZ)/2);
  for(let gx=geoCell(Math.min(...xs));gx<=geoCell(Math.max(...xs));gx++)for(let gy=geoCell(Math.min(...ys));gy<=geoCell(Math.max(...ys));gy++){
   const point={x:gx*16+8,y:gy*16+8,z:middle};if(!pointInPolygon(point,area.polygon))continue;
   const ground=worldGeodata.point(point);if(!ground?.nswe||ground.z>area.maxZ||!nativeGroundAllowed(ground))continue;
   if(territory.bannedTerritories.some(b=>ground.z>=b.minZ&&ground.z<=b.maxZ&&pointInPolygon(ground,b.polygon)))continue;
   add({gx,gy,...ground});
  }
  // A narrow valid polygon can miss all cell centres. This seed uses the
  // original placement proposal and ground checks, never its authored centroid.
  let seed=42;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),point=sampleNativeTerritory(territory,{random});
  if(!point)throw Error('Unverified source territory seed: '+key);add({gx:geoCell(point.x),gy:geoCell(point.y),...worldGeodata.point(point)});
 }
 for(let at=0;at<queue.length;at++){
  const n=queue[at];queue[at]=null;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   if(!inside({gx:n.gx+dx,gy:n.gy+dy}))continue;
   const next=nativeStep(worldGeodata,n,dx,dy);if(!next||!covered(next))continue;
   const back=nativeStep(worldGeodata,next,-dx,-dy);if(back?.z===n.z)add(next);
  }
 }
 if(!mask.size)throw Error('No covered source cells');
 const edges=new Map(),vertex=(x,y)=>x*(height+1)+y,xy=v=>[Math.floor(v/(height+1)),v%(height+1)];
 function edge(x,y,xx,yy){const key=vertex(x,y),list=edges.get(key)||[];list.push(vertex(xx,yy));edges.set(key,list);}
 for(const i of mask){const x=Math.floor(i/height),y=i%height;
  if(y===0||!mask.has(i-1))edge(x,y,x+1,y);
  if(x===width-1||!mask.has(i+height))edge(x+1,y,x+1,y+1);
  if(y===height-1||!mask.has(i+1))edge(x+1,y+1,x,y+1);
  if(x===0||!mask.has(i-height))edge(x,y+1,x,y);
 }
 const commands=[],direction=(a,b)=>{const [x,y]=xy(a),[xx,yy]=xy(b);return xx>x?0:yy>y?1:xx<x?2:3;};let contours=0,corners=0;
 while(edges.size){
  const first=edges.keys().next().value;let at=first,previousDir=null;const points=[];
  do{
   const candidates=edges.get(at);if(!candidates?.length)throw Error('Open cave contour');
   candidates.sort((a,b)=>previousDir===null?a-b:[1,0,3,2].indexOf((direction(at,a)-previousDir+4)%4)-[1,0,3,2].indexOf((direction(at,b)-previousDir+4)%4));
   const next=candidates.shift(),dir=direction(at,next);if(!candidates.length)edges.delete(at);
   if(previousDir===null||dir!==previousDir)points.push(xy(at));previousDir=dir;at=next;
  }while(at!==first);
  commands.push('M'+points.map(([x,y])=>x+' '+y).join('L')+'Z');contours++;corners+=points.length;
 }
 const color=id==='stakato-nest'?'#51573f':id==='forge-of-the-gods'?'#674536':'#5e5143',svg=`<!-- Derived from L2J High Five geodata ${worldGeodata.manifest.commit}, GPL-3.0. Source: scripts/l2j/build-native-interior-maps.mjs; license: data/l2j-geodata/LICENSE. -->\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path fill="${color}" stroke="#a9a48c" stroke-width=".5" fill-rule="evenodd" d="${commands.join('')}"/></svg>\n`,asset=`/art/world/native/${id}${sourceFloor?'-floor-'+sourceFloor:''}.svg`;
 fs.mkdirSync('webapp/art/world/native',{recursive:true});fs.writeFileSync('webapp'+asset,svg);

 const regions={};for(let x=left;x<=right;x+=2048)for(let y=top;y<=bottom;y+=2048){const region=geoRegionId(x*16,y*16);regions[region]=worldGeodata.manifest.regions[region]?.sha256;}
 for(const p of [{x:left,y:bottom},{x:right,y:top},{x:right,y:bottom}]){const region=geoRegionId(p.x*16,p.y*16);regions[region]=worldGeodata.manifest.regions[region]?.sha256;}
 if(Object.values(regions).some(sha=>!sha))throw Error('Missing source region');
 maps[key]={...(sourceFloor?{zone:id,sourceFloor}:{}),asset,regions,bounds:{x:left*16,y:top*16,w:width*16,h:height*16},cells:mask.size,layerCells:seen.size,contours,corners,bytes:Buffer.byteLength(svg),sha256:createHash('sha256').update(svg).digest('hex'),files};
 console.log(key,mask.size+' cells',seen.size+' layer cells',contours+' contours',maps[key].bytes+' SVG bytes');
}
fs.writeFileSync(file,'// Static covered-cell footprints from original L2J geodata; display crop is not collision.\nexport default '+JSON.stringify({geodataCommit:worldGeodata.manifest.commit,npcSourceCommit:MISSING_WORLD_SOURCE.commit,maps},null,2)+';\n');
