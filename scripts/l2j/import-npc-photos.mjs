// Original NPC screenshots keyed by the exact High Five NPC ID. No archetype substitution.
// node scripts/l2j/import-npc-photos.mjs [--offline]
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {getZones} from '../../functions/game/hunt/huntMobs.js';
import bosses from '../../webapp/l2-boss-art.js';
import {worldRows,EPIC_NPC} from '../../functions/game/boss/worldBosses.js';

const cache='.tmp/l2-npc-photos';fs.mkdirSync(cache,{recursive:true});
const rows=new Map(getZones().flatMap(z=>z.mobs).map(m=>[String(m.id),{id:String(m.id),name:m.name}]));
for(const row of [...worldRows,...Object.entries(EPIC_NPC).map(([id,name])=>({id,name}))])if(!rows.has(String(row.id)))rows.set(String(row.id),{id:String(row.id),name:row.name});
for(const [name,asset] of Object.entries(bosses))if(!rows.has(String(asset.npcId)))rows.set(String(asset.npcId),{id:String(asset.npcId),name});
const local=new Map(Object.values(bosses).map(a=>[String(a.npcId),a]));
const placeholders=new Set([10356,54746]);
const valid=b=>b.length>500&&!placeholders.has(b.length)&&((b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')||b.subarray(0,3).equals(Buffer.from([255,216,255]))||b.subarray(0,8).toString('hex')==='89504e470d0a1a0a');
const catalog=[...rows.values()];
const results=[];let cursor=0,done=0;
await Promise.all(Array.from({length:6},async()=>{
 while(cursor<rows.size){
  const row=catalog[cursor++],file=`${cache}/${row.id}.image`,existing=local.get(row.id);
  const source=existing?.source||`https://l2elo.com/images/npc-photos/${row.id}.webp`;
  try{
   let data;
   if(existing&&fs.existsSync('webapp'+existing.image))data=fs.readFileSync('webapp'+existing.image);
   else if(fs.existsSync(file))data=fs.readFileSync(file);
   else if(process.argv.includes('--offline'))throw Error('Not cached');
   else{
    for(let attempt=0;attempt<2;attempt++){
     try{const response=await fetch(source,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);data=Buffer.from(await response.arrayBuffer());break;}
     catch(error){if(attempt||/HTTP 404/.test(error.message))throw error;}
    }
   }
   if(!valid(data))throw Error('Unavailable screenshot / provider placeholder');
   fs.writeFileSync(file,data);
   results.push({...row,source,file,sha256:createHash('sha256').update(data).digest('hex')});
  }catch(error){results.push({...row,source,missing:error.message});}
  if(++done%100===0)console.log(`NPC screenshots ${done}/${rows.size}`);
 }
}));
results.sort((a,b)=>Number(a.id)-Number(b.id));
fs.writeFileSync(`${cache}/catalog.json`,JSON.stringify(results));
const build=spawnSync(process.env.PYTHON||'python',['scripts/l2j/build-npc-photos.py',`${cache}/catalog.json`],{stdio:'inherit'});
if(build.status!==0)process.exit(build.status||1);
