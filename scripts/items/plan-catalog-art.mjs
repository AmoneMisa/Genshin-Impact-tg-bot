import fs from 'node:fs';
import {getCatalog} from '../../functions/game/equipment/catalog.js';
import {normalizeLootKind} from '../../webapp/loot-renderer.js';
import {itemArtKey} from '../../webapp/art/items-art.js';

const target='art-source/catalog-art-jobs.json';
if(fs.existsSync(target)) throw new Error('Keep the existing plan when resuming; do not regenerate it after mappings change.');
const groups=Map.groupBy(getCatalog(),item=>itemArtKey(normalizeLootKind(item),item));
const source=fs.readFileSync('art-source/epic-art-jobs.mjs','utf8');
const master=JSON.parse(source.split(' = ')[1].replace(/;\s*$/,'')).at(0).prompt.split('Boss stage painting')[0];
const material={heavy:'structured metal plates, articulated rivets and reinforced edges',light:'supple leather, stitched panels and light flexible guards',robe:'woven fabric, flowing drape and finely embroidered edging'};
const levels={noGrade:'entry-level practical design, plain iron or bronze and leather, very restrained decoration, no large gems or magic flames',D:'modest crafted design, steel and leather, small engraved accents, no elaborate gems',C:'refined mid-level design, contrasting steel and dark leather, controlled silver or gold accents',B:'premium detailed design, sculpted trims and one small focal jewel',A:'royal design, refined gold filigree and a restrained gemstone glow',S:'elite design, intricate sculpted metal and strong focal jewel',S80:'exalted design, elegant obsidian and gold accents with controlled magical glow',S84:'highest-tier design, elaborate crisp sculpted ornament and luminous crystal details'};
const jobs=[];
for(const [base,items] of groups){
  const ordered=[...items].sort((a,b)=>b.gradeIndex-a.gradeIndex||Number(b.kind==='heavy')-Number(a.kind==='heavy'));
  for(const item of ordered.slice(1)){
    const key='catalog-'+item.id.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const identity={id:item.id,name:item.name,grade:item.grade,kind:item.kind,category:item.category};
    const subject=item.mainType==='armor'?`${item.category} equipment for ${item.kind} armour: ${material[item.kind]}`:`${normalizeLootKind(item)} equipment`;
    const form=item.category==='fullBody'?'An entire empty wearable outfit, including torso and lower drape.':item.category==='gloves'||item.category==='boots'||item.category==='greaves'||item.kind==='fists'?'A matching pair of wearable pieces or weapons.':'One complete equipment object.';
    jobs.push({...identity,key,previousKey:base,prompt:master+`\nPaint a unique transparent equipment inventory icon for the named item "${item.name}" (${item.grade} grade). Subject: ${subject}. ${form}\nTier: ${levels[item.grade]}. Let the item name inform the material and motif; keep construction appropriate to its armour type. Give this named item a distinctive silhouette and detailing, not a recolour of another item. Premium painted dark fantasy in the established WhitesLove palette.\nThree-quarter view, centered, clean true alpha, entire subject visible with at least 8% breathing room. No wearer, no hands, no body, no pedestal, no text or item labels, no UI. Clear silhouette readable at 48 and 96 pixels. PNG source; mobile delivery at 128, 256 and 512 pixels.`});
  }
}
jobs.sort((a,b)=>Number(b.id.includes(':armor:'))-Number(a.id.includes(':armor:'))||a.id.localeCompare(b.id));
fs.writeFileSync(target,JSON.stringify(jobs,null,2)+'\n');
console.log(JSON.stringify({catalogue:getCatalog().length,retained:groups.size,newPaintings:jobs.length,first:jobs[0]}));
