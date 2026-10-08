import fs from 'node:fs';
import {CATALOG_ITEM_ART} from '../../webapp/art/catalog-item-art.js';
import {ART_BUDGET} from './check-art.js';
const jobs=JSON.parse(fs.readFileSync('art-source/catalog-art-jobs.json','utf8'));
const requested=process.argv.slice(2);
if(!requested.length)throw Error('Pass only visually reviewed asset keys');
const approved=new Map(CATALOG_ITEM_ART.map(entry=>[entry.key,entry]));
for(const key of requested){
  const job=jobs.find(entry=>entry.key===key);if(!job)throw Error('Unknown job '+key);
  if(!fs.existsSync(`art-source/items/catalog/${key}.png`))throw Error('Missing source '+key);
  for(const width of [128,256,512]){
    const b=fs.readFileSync(`webapp/art/items/v1/${key}-${width}.webp`);
    if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP'||b.length>ART_BUDGET[width])throw Error('Invalid/over-budget WebP '+key);
  }
  const {id,name,grade,kind,category}=job;approved.set(key,{id,name,grade,kind,category,key});
}
const entries=[...approved.values()].sort((a,b)=>a.id.localeCompare(b.id));
fs.writeFileSync('webapp/art/catalog-item-art.js','// Only reviewed, converted paintings are published here.\nexport const CATALOG_ITEM_ART = Object.freeze('+JSON.stringify(entries,null,2)+'.map(entry=>Object.freeze(entry)));\n');
fs.writeFileSync('art-source/catalog-art-progress.json',JSON.stringify({requestedAdditionalPaintings:jobs.length,published:entries.length,remaining:jobs.length-entries.length,generated:jobs.filter(job=>fs.existsSync(`art-source/items/catalog/${job.key}.png`)).length,pending:jobs.filter(job=>!approved.has(job.key)).map(job=>job.key)},null,2)+'\n');
console.log(`${entries.length} named item paintings published`);
