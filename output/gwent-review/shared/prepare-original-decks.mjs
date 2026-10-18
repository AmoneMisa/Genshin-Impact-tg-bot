// Reproducible review packages for the four remaining original factions.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {deckFor} from '../../../webapp/gwent-decks.js';
import {GWENT_ART} from '../../../webapp/gwent-art.js';
import {prepareLayers} from './prepare-layers.mjs';
const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json');
const sharp=require('sharp'),root=fileURLToPath(new URL('..',import.meta.url));
const jobs=JSON.parse(fs.readFileSync(new URL('remaining-jobs.json',import.meta.url)));
const squirrel=JSON.parse(fs.readFileSync(new URL('squirrel-job.json',import.meta.url)));
const ribbons={'northern-realms':'redanian-foot',nilfgaard:'vreemde',monsters:'foglet',scoiatael:'riordain'};
const patches={monsters:{'ice-giant':{strength:6}},scoiatael:{'vrihedd-cadet':{strength:5,ability:'swap'}}};
const reuse=Object.fromEntries(['el-fire','el-earth','el-water','ex-prep','ex-trap','ex-medic'].map(id=>[id,'../wild-hunt-v1']));reuse.ambush='../velen-v1';
for(const job of jobs){
 const out=path.join(root,job.faction+'-extended-v1');fs.mkdirSync(out,{recursive:true});
 const deck=deckFor('extended',job.faction),classic=deckFor('classic',job.faction);
 const spec={faction:job.faction,ruleset:'extended',prefix:job.id.split('-')[0]+'-',factionCardIds:classic.cards.map(([c])=>c.id).filter(id=>!deckFor('classic','skellige').cards.some(([c])=>c.id===id)),reuse,
  frames:{unit:'layers/unit-frame.png'},nativeRibbonSource:ribbons[job.faction],nativePatches:patches[job.faction]||{},previewIds:[job.id,...Object.keys(patches[job.faction]||{})],detailId:job.id};
 fs.writeFileSync(path.join(out,'package.json'),JSON.stringify(spec,null,2));
 if(job.faction==='scoiatael'){spec.tokens=['squirrel'];spec.previewIds.push('squirrel');}
 fs.writeFileSync(path.join(out,'package.json'),JSON.stringify(spec,null,2));
 fs.writeFileSync(path.join(out,'quotes.json'),JSON.stringify({[job.id]:job.quote,...(spec.tokens?{squirrel:squirrel.quote}:{})},null,2));
 fs.writeFileSync(path.join(out,'generation-jobs.json'),JSON.stringify(spec.tokens?[job,squirrel]:[job],null,2));
 const generatedResults=[{id:job.id,file:'illustrations/'+job.id+'.png',source:job.generatedSource,tool:'built-in image_gen'}];
 if(spec.tokens)generatedResults.push({id:'squirrel',file:'illustrations/squirrel.png',source:squirrel.generatedSource,tool:'built-in image_gen'});
 fs.writeFileSync(path.join(out,'generation-results.json'),JSON.stringify(generatedResults,null,2));
 fs.writeFileSync(path.join(out,'approval.json'),JSON.stringify({status:'pending',integrated:false,pushed:false},null,2));
 await prepareLayers(out,job.faction);
 // Reuse the supplied faction's complete ribbon and original emblem in their native positions.
 // Existing badges fall underneath the exact same independently composited power/row badges.
 const {data,info}=await sharp(path.join(root,'templates-v1/unit.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const source=await sharp('webapp'+GWENT_ART[spec.nativeRibbonSource]).ensureAlpha().raw().toBuffer();
 for(let y=0;y<515;y++)for(let x=16;x<73;x++){
  const at=(y*310+x)*4;if(data[at+3])for(let c=0;c<3;c++)data[at+c]=source[at+c];
 }
 await sharp(data,{raw:info}).png().toFile(path.join(out,'layers/unit-frame.png'));
 const provenancePath=path.join(out,'layers/provenance.json'),provenance=JSON.parse(fs.readFileSync(provenancePath));
 provenance.frame={source:GWENT_ART[spec.nativeRibbonSource],region:{x:16,y:0,width:57,height:515},alpha:'Shared template alpha preserved',emblem:'Original printed emblem retained in original coordinates; no second emblem overlay'};
 fs.writeFileSync(provenancePath,JSON.stringify(provenance,null,2));
 for(const name of ['build-deck.mjs','check-deck.mjs']){
  const fn=name==='build-deck.mjs'?'buildDeck':'checkDeck';
  fs.writeFileSync(path.join(out,name),`import {${fn}} from '../shared/${name}';\nimport fs from 'node:fs';\nimport {fileURLToPath} from 'node:url';\nawait ${fn}(fileURLToPath(new URL('.',import.meta.url)),JSON.parse(fs.readFileSync(new URL('package.json',import.meta.url))));\n`);
 }
 const plan={ruleset:'extended',faction:job.faction,leaders:deck.leaders,cards:deck.cards.map(([card,copies])=>({...card,copies,source:reuse[card.id]?'shared face':spec.nativePatches[card.id]?'badge-only patch':GWENT_ART[card.id]?'supplied print unchanged':'new illustration'}))};
 fs.writeFileSync(path.join(out,'source-plan.json'),JSON.stringify(plan,null,2));
}
