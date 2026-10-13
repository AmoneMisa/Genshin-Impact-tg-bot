// Original Mobius High Five data, commit 9fb01cb20513e55190cdde8d91e41be2c0914f84.
// Extract data/scripts, data/spawns and data/instances into .tmp/world-source/full.
import fs from 'node:fs';
import positions from '../../template/worldBossMap.js';
import {worldBossTemplates} from '../../functions/game/boss/epicBosses.js';

const root='.tmp/world-source/full/';
const bosses=worldBossTemplates(), ids=new Set(bosses.map(b=>b.world.npcId));
const before=bosses.filter(b=>positions[b.world.npcId]).length;
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
const sources=files(root.replace(/\/$/,'')).filter(f=>/\.(java|xml)$/.test(f)).map(f=>({file:f.slice(root.length),text:fs.readFileSync(f,'utf8')}));
function put(id,point,source,extra={}){
 id=Number(id);if(!ids.has(id)||positions[id]?.source||!point||!['x','y','z'].every(k=>Number.isFinite(point[k]))||(!point.x&&!point.y))return;
 positions[id]={...point,source,...extra};
}
const attrs=s=>Object.fromEntries([...s.matchAll(/(\w+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const xyz=a=>['x','y','z'].every(k=>a[k]!==undefined)?Object.fromEntries(['x','y','z'].map(k=>[k,Number(a[k])])):null;
// Only NPC id attributes, never heading values, respawn times or comments.
for(const {file,text} of sources.filter(s=>s.file.endsWith('.xml'))){
 const clean=text.replace(/<!--[\s\S]*?-->/g,'');
 for(const m of clean.matchAll(/<npc\b([^>]*?)(?:\/>|>([\s\S]*?)<\/npc>)/g)){
  const a=attrs(m[1]),direct=xyz(a),nested=m[2]?.match(/<location\b([^>]+)\/>/);
  put(a.id,direct||xyz(attrs(nested?.[1]||'')),file,{...(file.startsWith('instances/')?{instance:true}:{} )});
 }
}
// Resolve an NPC constant only when that exact constant is passed to addSpawn.
for(const {file,text} of sources.filter(s=>s.file.endsWith('.java'))){
 const clean=text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
 const constants=Object.fromEntries([...clean.matchAll(/\bint\s+(\w+)\s*=\s*(\d+)\s*;/g)].map(m=>[m[1],Number(m[2])]));
 const locations=Object.fromEntries([...clean.matchAll(/\bLocation\s+(\w+)\s*=\s*new Location\((-?\d+),\s*(-?\d+),\s*(-?\d+)/g)].map(m=>[m[1],{x:+m[2],y:+m[3],z:+m[4]}]));
 for(const m of clean.matchAll(/addSpawn\(\s*(\w+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/g))put(constants[m[1]]||Number(m[1]),{x:+m[2],y:+m[3],z:+m[4]},file+'#addSpawn('+m[1]+')');
 for(const m of clean.matchAll(/addSpawn\(\s*(\w+)\s*,\s*(\w+)\s*[,)]/g))put(constants[m[1]]||Number(m[1]),locations[m[2]],file+'#'+m[2]);
 // These scripts explicitly use {npcId,x,y,z,...} arrays as their spawn tables.
 if(/\/(Kamaloka|HallOfSufferingAttack)\.java$/.test(file))for(const m of clean.matchAll(/\{\s*(\d{5}),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)[,}]/g))put(m[1],{x:+m[2],y:+m[3],z:+m[4]},file+'#spawn-table',{instance:true});
}
function source(file){const s=sources.find(s=>s.file===file);if(!s)throw Error('Missing '+file);return s.text;}
function named(file,name){const m=source(file).match(new RegExp(name+'\\s*=\\s*new Location\\((-?\\d+),\\s*(-?\\d+),\\s*(-?\\d+)'));if(!m)throw Error('Missing '+name);return {x:+m[1],y:+m[2],z:+m[3]};}
function group(file,array,point,extra={}){const m=source(file).match(new RegExp('\\b'+array+'\\s*=\\s*\\{([\\s\\S]*?)\\}'));if(!m)throw Error('Missing '+array);for(const id of m[1].match(/\b\d{5}\b/g)||[])put(id,point,file+'#'+array,extra);}
const castle='scripts/instances/CastleDungeon/CastleDungeon.java';
for(const array of ['RAIDS1','RAIDS2','RAIDS3'])group(castle,array,named(castle,'RAIDS_LOC'),{instance:true});
const fort='scripts/quests/Q00511_AwlUnderFoot/Q00511_AwlUnderFoot.java';
const fortSpawn=source(fort).match(/addSpawn\(spawnId,\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)/);
for(const array of ['RAIDS1','RAIDS2','RAIDS3'])group(fort,array,{x:+fortSpawn[1],y:+fortSpawn[2],z:+fortSpawn[3]},{instance:true});
const altar='scripts/ai/others/AltarsOfSacrifice.java';
for(const m of source(altar).matchAll(/new Altar\s*\(\s*new Location\((-?\d+),\s*(-?\d+),\s*(-?\d+)\)([\s\S]*?)\)/g))for(const id of m[4].match(/\b\d{5}\b/g)||[])put(id,{x:+m[1],y:+m[2],z:+m[3]},altar+'#altar',{spawnKind:'altar',spawnRadius:{min:250,max:500}});
// The boss is spawned at the selected vortex; preserve every possible spot.
const vortex='scripts/ai/areas/DragonValley/DragonVortex/DragonVortex.java';
const spots=[1,2,3,4].map(i=>named(vortex,'SPOT_'+i));
for(const m of source(vortex).matchAll(/\braid = (\w+);/g)){const id=source(vortex).match(new RegExp('\\b'+m[1]+' = (\\d+);'))?.[1];put(id,spots[0],vortex+'#'+m[1],{spawnKind:'vortex',spots});}
// Seven Signs controls these original SQL entries; they are not obsolete rows.
const sql=fs.readFileSync('.tmp/world-source/raidboss_spawnlist.sql','utf8');
for(const m of sql.matchAll(/^-- \((\d+),(-?\d+),(-?\d+),(-?\d+),[^\n]+Spawn by Seven Signs/gm))put(m[1],{x:+m[2],y:+m[3],z:+m[4]},'raidboss_spawnlist.sql#SevenSigns',{spawnKind:'seven-signs'});
for(const m of sql.matchAll(/^-- \((\d+),(-?\d+),(-?\d+),(-?\d+),[^\n]+Spawn by Quest/gm))put(m[1],{x:+m[2],y:+m[3],z:+m[4]},'raidboss_spawnlist.sql#Quest',{spawnKind:'quest'});
// Anakazel (25333) is in area 1, room 9; the table specifies the room's entry point.
if(!/area type="1"[\s\S]*?room id="9"[\s\S]*?mobId="25333"/.test(source('DimensionalRift.xml')))throw Error('Missing recruit Anakazel room');
const riftRow=fs.readFileSync('.tmp/world-source/dimensional_rift.sql','utf8').match(/^\(1,\s*9,([^\n]+)\)/m);
if(!riftRow)throw Error('Missing rift room coordinates');
const rift=riftRow[1].split(',').map(Number);
put(25333,{x:rift[6],y:rift[7],z:rift[8]},'dimensional_rift.sql#type=1,room_id=9',{instance:true,spawnKind:'rift',spawnBounds:{xMin:rift[0],xMax:rift[1],yMin:rift[2],yMax:rift[3],zMin:rift[4],zMax:rift[5]}});
const naia='scripts/ai/areas/Hellbound/AI/Zones/TowerOfNaia/TowerOfNaia.java';
const merge=source(naia).match(/SPORES_MERGE_POSITION\s*=\s*\{([\s\S]*?)\};/)[1];
const mergeSpots=[...merge.matchAll(/\{\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)/g)].map(m=>({x:+m[1],y:+m[2],z:+m[3]}));
// EPIDOSES and SPORES_MERGE_POSITION have the same explicit element order.
put(25609,mergeSpots[1],naia+'#SPORES_MERGE_POSITION[1]',{spawnKind:'spore-challenge'});
const ice='scripts/instances/IceQueensCastleBattle/IceQueensCastleBattle.java';
put(25699,named(ice,'GLAKIAS_SPAWN'),ice+'#GLAKIAS_SPAWN',{instance:true});
// Stakato Chief is summoned at a cocoon's actual spawn, not at a zone centre.
const cocoons=sources.filter(s=>s.file.startsWith('spawns/')).flatMap(({file,text})=>[...text.matchAll(/<npc\b([^>]+)\/>/g)].flatMap(m=>{const a=attrs(m[1]);return Number(a.id)>=18793&&Number(a.id)<=18798&&xyz(a)?[{...xyz(a),source:file}]:[];}));
if(!cocoons.length)throw Error('Missing Stakato cocoon spawns');
put(25667,xyz(cocoons[0]),cocoons[0].source+'#'+18793,{spawnKind:'cocoon',spots:cocoons.map(({source,...point})=>point)});
for(const b of bosses){const point=positions[b.world.npcId];if(point?.source?.includes('/instances/'))point.instance=true;if(point?.instance&&!point.room)point.room={x:point.x,y:point.y,z:point.z};}
fs.writeFileSync('template/worldBossMap.js','// Original H5 raid SQL, spawn XML and boss scripts; instance rooms and variable spawn spots retained.\nexport default '+JSON.stringify(positions)+';\n');
const missing=bosses.filter(b=>!positions[b.world.npcId]).map(b=>{
 const id=b.world.npcId,line=sql.split('\n').find(l=>l.startsWith('-- ('+id+','));
 return {id,name:b.name,level:b.world.level||b.epic.minLevel,raid:!!b.world.raid,reason:line?.includes('Not spawned anymore')?'removed-in-high-five':line?.includes('stats to be done')?'unfinished-source-data':'no-confirmed-spawn',source:line?.trim()||null};
});
fs.writeFileSync('docs/atlas-redesign/missing-raid-spawns.json',JSON.stringify(missing,null,2)+'\n');
console.log(JSON.stringify({added:bosses.filter(b=>positions[b.world.npcId]).length-before,mapped:bosses.length-missing.length,missing:missing.length}));
