// Bundle the pinned original L2 basemap and city tiles for reliable in-game loading.
import fs from 'node:fs';
import {CITIES} from '../../template/worldMap.js';
const directory='webapp/art/world/l2';fs.mkdirSync(directory,{recursive:true});
const world='https://cdn.jsdelivr.net/gh/L2jBrasil/L2BaseMap@7c02bfdf829004e024a5f4ade32ebfbfacbac4e1/images/maps/clear-map.webp';
const source='https://cdn.jsdelivr.net/gh/npetrovski/l2-world-map@0751a218798b1b759ff3555c7b48a025df49e332/Maps/';
const rows=[{file:'world.webp',url:world},...new Set(CITIES.map(c=>`${Math.floor(c.x/32768)+20}_${Math.floor(c.y/32768)+18}.jpg`))].map(r=>typeof r==='string'?{file:r,url:source+r}:r);
const assets=[],missing=[];
await Promise.all(rows.map(async r=>{try{const response=await fetch(r.url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('HTTP '+response.status);const data=Buffer.from(await response.arrayBuffer());if(!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Not an image');fs.writeFileSync(directory+'/'+r.file,data);assets.push({...r,bytes:data.length});}catch(e){missing.push({...r,error:e.message});}}));
fs.writeFileSync(directory+'/manifest.json',JSON.stringify({assets,missing},null,2));console.log(JSON.stringify({assets:assets.length,bytes:assets.reduce((n,r)=>n+r.bytes,0),missing}));
