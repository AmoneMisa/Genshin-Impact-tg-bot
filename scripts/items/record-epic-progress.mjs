import fs from 'node:fs';
import {SPECIAL_ITEM_ART} from '../../webapp/art/special-item-art.js';
const jobs=JSON.parse(fs.readFileSync('art-source/epic-collection/jobs.json','utf8'));
const completed=jobs.filter(j=>SPECIAL_ITEM_ART.includes(j.key));
for(const job of completed)for(const size of [128,256,512]){
 const file=`webapp/art/items/v1/${job.key}-${size}.webp`,data=fs.readFileSync(file);
 if(data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WEBP')throw Error(file+' invalid');
 if(data.length>({128:24000,256:80000,512:240000})[size])throw Error(file+' exceeds budget');
}
const progress={requested:jobs.length,reviewed:completed.map(j=>j.key),published:completed.map(j=>j.key),pending:jobs.filter(j=>!SPECIAL_ITEM_ART.includes(j.key)).map(j=>j.key),generationBlocked:{reason:'usage_limit_reached',resetAt:'2026-10-09T07:29:37Z',resetMoscow:'9 October 2026 10:29:37'},resumeMoscow:'9 October 2026 10:35',mobileWidths:[320,390],referenceArchive:completed.map(j=>j.referenceFile.split('\\').at(-1)).filter((n,i,a)=>a.indexOf(n)===i)};
fs.writeFileSync('art-source/epic-collection/progress.json',JSON.stringify(progress,null,2)+'\n');
fs.writeFileSync('art-source/epic-collection/STATUS.md',`# Epic weapon and potion collection

14 epic weapon definitions cover 8 existing weapon kinds. Their stats, slots and class rules match the S84 catalogue. Epic raids have a separate 10% weapon roll among eligible level-84 contributors, weighted by damage. Unpainted weapons use existing type artwork until their own paintings pass review.

7 of 14 weapon paintings reviewed and published at 128/256/512 WebP. Masters and exact prompts: art-source/items/epic-collection. Contact sheet: docs/epic-collection-review-1.webp. All published images passed dark/light, 48/96px and transparency review; browser gallery passed at 320/390px without overflow or model requests, including reduced-motion checks.

7 Lineage II buff concepts implemented: Might, Shield, Haste, Focus, Death Whisper, Guidance, Wind Walk. Duration 20 minutes; the same potion refreshes its timer; different effects coexist. Numeric bonuses are adapted to this game's combat scale, not claimed as exact Lineage II patch values. Values are resolved server-side from template/buffPotions.js. Purchases, consumption, expiry, combat modifiers and active-effect UI are implemented. Mongo potion/shop seed versions bumped to 2. Potion images are pending and use the existing flask fallback.

Official source for buff concepts and 20-minute duration: https://www.lineage2.com/en-us/news/azure-treasure-chests

Generation stopped immediately at the first quota response, on epic-weapon-solar-bow. Reset: 9 October 2026 10:29:37 Moscow. Existing heartbeat reactivated for 10:35 Moscow. Remaining: 7 weapon paintings, then 13 potion paintings (6 HP/MP + 7 buffs). Do not retry until quota resets. Read jobs.json and progress.json; skip published assets, use the built-in image tool, one asset per call. Stable reference copies remain in references. Only the 5 references actually used for these 7 paintings were moved from Desktop/images to Desktop/images/done. No temporary attachments moved.

After every batch review and mobile conversion, publish only accepted keys in webapp/art/special-item-art.js. Update progress, archive only newly consumed original references, and continue weapons/potions before avatars. Do not overwrite jobs.json by rerunning the plan. Do not regenerate the already completed 224-item catalogue or world artwork. Optional shop illustrations remain outside scope.
`);
console.log(JSON.stringify({requested:jobs.length,published:completed.length,pending:progress.pending.length}));
