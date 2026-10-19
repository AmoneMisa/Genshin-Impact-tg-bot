import fs from 'node:fs';
import {worldRows} from '../../functions/game/boss/worldBosses.js';
const file='webapp/art/bosses/l2/manifest.json',manifest=JSON.parse(fs.readFileSync(file,'utf8'));
const changes=worldRows.filter(row=>manifest.assets[row.name]?.npcId!==row.id);
await Promise.all(changes.map(async row=>{
 const source=`https://l2elo.com/images/npc-photos/${row.id}.webp`;
 try{
  const response=await fetch(source,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=Buffer.from(await response.arrayBuffer());
  if(data.length<1000||[10356,54746].includes(data.length)||data.toString('ascii',0,4)!=='RIFF')throw Error('Original screenshot unavailable');
  const image=`/art/bosses/l2/${row.id}.webp`;fs.writeFileSync('webapp'+image,data);
  manifest.assets[row.name]={npcId:row.id,image,source};manifest.missing=manifest.missing.filter(m=>m.id!==row.id);
 }catch(error){delete manifest.assets[row.name];manifest.missing=manifest.missing.filter(m=>m.id!==row.id);manifest.missing.push({id:row.id,name:row.name,error:error.message});}
}));
manifest.assets=Object.fromEntries(Object.entries(manifest.assets).sort(([a],[b])=>a.localeCompare(b)));
fs.writeFileSync(file,JSON.stringify(manifest,null,2));
fs.writeFileSync('webapp/l2-boss-art.js','// Original Lineage II NPC screenshots; source IDs reconciled with active H5 revisions.\nexport default '+JSON.stringify(manifest.assets,null,2)+';\n');
console.log('Reconciled source screenshots:',changes.length,'unavailable:',changes.filter(r=>!manifest.assets[r.name]).map(r=>r.id));
