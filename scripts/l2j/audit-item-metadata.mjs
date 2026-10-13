import fs from 'node:fs';
import ITEMS from '../../template/l2Items.js';
import {L2_MATERIAL_ART} from '../../webapp/art/l2-icon-art.js';
import {ITEM_ICONS} from '../../webapp/art/l2-gameplay-icons.js';
import {materialInfo} from '../../functions/game/player/materials.js';
const missing=[],missingFiles=[];
for(const [id,row] of Object.entries(ITEMS)){
 const key='l2_'+id,info=materialInfo(key),art=ITEM_ICONS[key]||L2_MATERIAL_ART[key];
 if(!info.name||!info.description)throw Error('Missing presentation '+key);
 if(!art)missing.push({id:Number(id),name:info.name,type:row[4],reason:'Original XML has no icon reference'});
 else {
  const file=ITEM_ICONS[key]?`webapp/art/l2-extra/${art}-32.webp`:`webapp/art/l2/${art}-128.webp`;
  if(!fs.existsSync(file))missingFiles.push({id:Number(id),file});
 }
}
fs.mkdirSync('docs/item-metadata',{recursive:true});
const report={catalogItems:Object.keys(ITEMS).length,withOriginalIcon:Object.keys(ITEMS).length-missing.length,missingOriginalIcons:missing,missingPublishedFiles:missingFiles,descriptionPolicy:'Descriptions derived from High Five item type and purpose; original descriptions retained where available. Not a verbatim client description dump.'};
fs.writeFileSync('docs/item-metadata/audit.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('docs/item-metadata/icon-import-ids.json',JSON.stringify(Object.keys(ITEMS).filter(id=>!L2_MATERIAL_ART['l2_'+id]))+'\n');
console.log(`${report.withOriginalIcon}/${report.catalogItems} original icons; ${missing.length} source gaps; ${missingFiles.length} missing published files`);
if(missingFiles.length)process.exitCode=1;
