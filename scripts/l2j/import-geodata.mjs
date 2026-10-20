import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {WORLD_EXTENSION} from '../../template/worldExtension.js';
import {CITIES,CITY_NPCS} from '../../template/worldMap.js';

export const GEO_REPOSITORY='https://gitlab.com/l2j/l2j-geodata';
export const GEO_COMMIT='378672ee9bffa47b37956911040fc7d5b1a7258e';
const base='https://gitlab.com/api/v4/projects/l2j%2Fl2j-geodata/repository';
const folder=path.resolve('data/l2j-geodata');fs.mkdirSync(folder,{recursive:true});
const args=process.argv.slice(2);
const requested=args.filter(s=>!['--surface-routes','--cities'].includes(s)).flatMap(s=>s.split(','));
if(args.includes('--cities'))for(const city of CITIES){
 const points=[city,...CITY_NPCS.filter(n=>n.city===city.id)];
 for(const point of points)requested.push(`${Math.floor(point.x/32768)+20}_${Math.floor(point.y/32768)+18}`);
}
if(args.includes('--surface-routes'))for(const {location,levels} of WORLD_EXTENSION.filter(r=>r.levels.source?.coordinateSpace==='surface')){
 const city=CITIES.find(c=>c.id===location.region);if(!city)continue;
 for(let x=Math.floor(Math.min(city.x,location.x)/32768);x<=Math.floor(Math.max(city.x,location.x)/32768);x++)
  for(let y=Math.floor(Math.min(city.y,location.y)/32768);y<=Math.floor(Math.max(city.y,location.y)/32768);y++)requested.push(`${x+20}_${y+18}`);
}
if(!requested.length||requested.some(id=>!/^\d{2}_\d{2}$/.test(id)))throw new Error('Usage: node scripts/l2j/import-geodata.mjs 20_21 20_22');
const sha=data=>createHash('sha256').update(data).digest('hex');
const sourceFile=path.join(folder,'source.js');
const previous=fs.existsSync(sourceFile)?(await import(new URL('../../data/l2j-geodata/source.js',import.meta.url))).default:{repository:GEO_REPOSITORY,commit:GEO_COMMIT,format:'L2J',license:'GPL-3.0',regions:{}};
if(previous.commit!==GEO_COMMIT)throw new Error('Geodata revisions must not be mixed');
async function get(file){
 const response=await fetch(`${base}/files/${encodeURIComponent(file)}/raw?ref=${GEO_COMMIT}`,{signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw new Error(`${file}: HTTP ${response.status}`);
 return Buffer.from(await response.arrayBuffer());
}
for(const name of ['LICENSE','README.md'])if(!fs.existsSync(path.join(folder,name)))fs.writeFileSync(path.join(folder,name),await get(name));
const queue=[...new Set(requested)].sort();
await Promise.all(Array.from({length:3},async()=>{
 while(queue.length){
  const id=queue.shift(),file=path.join(folder,id+'.l2j.gz');
  if(previous.regions[id]&&fs.existsSync(file)&&sha(fs.readFileSync(file))===previous.regions[id].compressedSha256){console.log(`cached ${id}`);continue;}
  const data=await get('geodata/'+id+'.l2j');
  if(data.length<196608||data[0]>2)throw new Error(`${id}: not a binary L2J region`);
  const packed=gzipSync(data,{level:9});fs.writeFileSync(file,packed);
  previous.regions[id]={file:id+'.l2j.gz',bytes:data.length,sha256:sha(data),compressedBytes:packed.length,compressedSha256:sha(packed),url:`${GEO_REPOSITORY}/-/blob/${GEO_COMMIT}/geodata/${id}.l2j`};
  console.log(`${id}: ${data.length} bytes, ${packed.length} compressed`);
 }
}));
previous.regions=Object.fromEntries(Object.entries(previous.regions).sort(([a],[b])=>a.localeCompare(b)));
fs.writeFileSync(sourceFile,'// Official L2J High Five geodata; original binary bytes preserved inside gzip.\nexport default '+JSON.stringify(previous,null,2)+';\n');
