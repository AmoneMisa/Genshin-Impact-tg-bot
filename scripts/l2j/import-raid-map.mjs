// Pinned Mobius H5 source 9fb01cb20513e55190cdde8d91e41be2c0914f84.
import fs from 'node:fs';
import positions from '../../template/worldBossMap.js';
import bosses from '../../template/worldBosses.js';
import {worldBossList} from '../../functions/game/boss/epicBosses.js';
const root='.tmp/world-source/',read=n=>fs.readFileSync(root+n,'utf8');
for(const m of read('raidboss_spawnlist.sql').matchAll(/^\((\d+),(-?\d+),(-?\d+),(-?\d+),/gm))positions[m[1]]={x:+m[2],y:+m[3],z:+m[4],source:'raidboss_spawnlist.sql'};
function loc(file,name){const s=read(file+'.java'),m=s.match(new RegExp(name+' = new Location\\((-?\\d+), (-?\\d+), (-?\\d+)'));if(!m)throw Error('Missing '+name);return {x:+m[1],y:+m[2],z:+m[3],source:file+'.java#'+name};}
const queen=read('QueenAnt.java');positions[29001]={...Object.fromEntries(['X','Y','Z'].map(k=>[k.toLowerCase(),+queen.match(new RegExp('QUEEN_NEST_'+k+' = (-?\\d+)'))[1]])),source:'QueenAnt.java#QUEEN_NEST'};
positions[29006]=loc('Core','CORE_DEFAULT_SPAWN');
const orfen=read('Orfen.java').split('ORFEN_SPAWN_LOCATIONS')[1].match(/new Location\((-?\d+), (-?\d+), (-?\d+)\)/);positions[29014]={x:+orfen[1],y:+orfen[2],z:+orfen[3],source:'Orfen.java#ORFEN_SPAWN_LOCATIONS'};
positions[29020]=loc('Baium','LOCATION_BAIUM_SPAWN');positions[29068]=loc('Antharas','ANTHARAS_SPAWN_LOCATION');positions[29028]=loc('Valakas','LOC_VALAKAS_LAIR');positions[29118]=loc('Beleth','BELETH_SPAWN');
positions[29179]=loc('IceQueensCastleBattle','MIDDLE_POINT');positions[29180]={...positions[29179]};
// Room coordinates differ from the geographic entrance for the Imperial Tomb instance.
positions[29047]={x:181376,y:-81008,z:-2728,room:loc('LastImperialTomb','ENTER_TELEPORT_FRINTEZZA_ROOM'),source:'spawns/Others/25_15.xml#32011'};
const rooms=read('CavernOfThePirateCaptain.java').match(/ROOM_DATA\s*=\s*\{([\s\S]*?)\};/)?.[1];
const roomRows=[...(rooms||'').matchAll(/\{\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)/g)].map(m=>({x:+m[1],y:+m[2],z:+m[3]}));
if(!roomRows.length)throw Error('Missing Zaken rooms');positions[29022]={...roomRows[0],rooms:roomRows,source:'CavernOfThePirateCaptain.java#ROOM_DATA'};
fs.writeFileSync('template/worldBossMap.js','// Original H5 raid SQL and epic script coordinates; instance rooms are retained separately.\nexport default '+JSON.stringify(positions)+';\n');
const missing=bosses.filter(b=>!positions[b.id]).map(b=>({id:b.id,name:b.name,level:b.level}));
fs.mkdirSync('docs/atlas-redesign',{recursive:true});fs.writeFileSync('docs/atlas-redesign/missing-raid-spawns.json',JSON.stringify(worldBossList().filter(b=>!b.map).map(b=>({name:b.name,level:b.level,raid:b.raid})),null,2)+'\n');
console.log(JSON.stringify({fixedBossPoints:bosses.length-missing.length,withoutStaticSpawn:missing.length}));
