import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITEM_ART_KEYS } from '../../webapp/art/items-art.js';
export const ART_BUDGET = Object.freeze({128:18000, 256:45000, 512:130000});
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../webapp/art/items/v1');
export function checkItemArt(dir = root) {
  const errors = [], rows = [];
  for (const key of ITEM_ART_KEYS) for (const width of [128,256,512]) {
    const name = `${key}-${width}.webp`, file = path.join(dir,name);
    if (!fs.existsSync(file)) { errors.push(`Missing ${name}`); continue; }
    const b = fs.readFileSync(file);
    if (b.toString('ascii',0,4)!=='RIFF' || b.toString('ascii',8,12)!=='WEBP') errors.push(`${name}: invalid WebP`);
    if (b.length > ART_BUDGET[width]) errors.push(`${name}: exceeds ${ART_BUDGET[width]} bytes`);
    rows.push({name,bytes:b.length});
  }
  return {errors,rows};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result=checkItemArt();
  console.log(`${result.rows.length} WebP files, ${(result.rows.reduce((n,r)=>n+r.bytes,0)/1024).toFixed(0)} KiB total`);
  for(const error of result.errors) console.error(error);
  process.exitCode=result.errors.length?1:0;
}
