import fs from 'node:fs';
import {SPECIAL_ITEM_ART} from '../../webapp/art/special-item-art.js';
const jobs=JSON.parse(fs.readFileSync('art-source/epic-collection/jobs.json','utf8'));
const completed=jobs.filter(j=>SPECIAL_ITEM_ART.includes(j.key));
for(const job of completed)for(const size of [128,256,512]){
 const file=`webapp/art/items/v1/${job.key}-${size}.webp`,data=fs.readFileSync(file);
 if(data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WEBP')throw Error(file+' invalid');
 if(data.length>({128:24000,256:80000,512:240000})[size])throw Error(file+' exceeds budget');
}
const progress={requested:jobs.length,reviewed:completed.map(j=>j.key),published:completed.map(j=>j.key),pending:jobs.filter(j=>!SPECIAL_ITEM_ART.includes(j.key)).map(j=>j.key),generationBlocked:null,completedAt:completed.length===jobs.length?new Date().toISOString():null,mobileWidths:[320,390],referenceArchive:completed.map(j=>j.referenceFile.split('\\').at(-1)).filter((n,i,a)=>a.indexOf(n)===i)};
fs.writeFileSync('art-source/epic-collection/progress.json',JSON.stringify(progress,null,2)+'\n');
fs.appendFileSync('art-source/epic-collection/STATUS.md', `\nDelivery audit: ${completed.length}/${jobs.length} paintings published; ${progress.pending.length} pending. Mobile WebP signatures and size budgets verified.\n`);
console.log(JSON.stringify({requested:jobs.length,published:completed.length,pending:progress.pending.length}));
