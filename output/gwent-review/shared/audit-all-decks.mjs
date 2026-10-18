// Checks every review package against live game data and the actual composited badge pixels.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {deckFor,TOKENS} from '../../../webapp/gwent-decks.js';
import {specialIconName} from './special-icon.mjs';
import {GWENT_ART} from '../../../webapp/gwent-art.js';
const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json');
const sharp=require('sharp'),root=fileURLToPath(new URL('..',import.meta.url));
const defaults={'el-fire':'fire','el-earth':'earth','el-water':'water','ex-prep':'prep','ex-trap':'trap','ex-medic':'recall',ambush:'ambush'};
const kind=c=>c.type==='leader'?'leader':c.type==='special'?'special':c.hero?'hero':'unit';
const icons=c=>[...['muster','bond','spy','medic','morale','horn','swap','mage'].filter(k=>c[k]),...(c.onPlay?.type==='scorchRow'?['scorch']:[])];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const summary={status:'passed',source:'webapp/gwent-decks.js and webapp/gwent-art.js',packages:[],issues:[]};
const raw=async p=>sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true});
// Opaque interior pixels prove which number/icon was painted, not just its manifest value.
async function badge(face,file,x,y,limit=null){
 const layer=await raw(file);let checked=0,bad=0;
 for(let yy=0;yy<layer.info.height;yy++)for(let xx=0;xx<layer.info.width;xx++){
  if(limit&&!limit(xx,yy))continue;
  const at=(yy*layer.info.width+xx)*4,px=x+xx,py=y+yy;
  if(layer.data[at+3]!==255||px<14&&py<14)continue;
  const to=(py*310+px)*4;
  checked++;
  if([0,1,2].some(c=>Math.abs(layer.data[at+c]-face.data[to+c])>3))bad++;
 }
 assert.ok(checked>100,'No readable opaque badge pixels: '+file);
 assert.ok(bad/checked<.002,`Wrong badge pixels ${file}: ${bad}/${checked}`);
 return checked;
}
for(const name of fs.readdirSync(root)){
 const out=path.join(root,name),manifest=path.join(out,'deck-manifest.json');if(!fs.existsSync(manifest))continue;
 const report=JSON.parse(fs.readFileSync(manifest)),spec=fs.existsSync(path.join(out,'package.json'))?JSON.parse(fs.readFileSync(path.join(out,'package.json'))):{faction:report.faction};
 const deck=deckFor(report.ruleset||spec.ruleset||'classic',report.faction);
 const expected=new Map([...deck.leaders.map(c=>[{...c,type:'leader'},1]),...deck.cards,...(spec.tokens||[]).map(id=>[TOKENS[id],0])].map(([c,copies])=>[c.id,{...c,copies}]));
 const result={folder:name,faction:report.faction,faces:report.cards.length,leaders:deck.leaders.length,newIllustrations:0,patched:0,reused:0,badgePixelsChecked:0,status:'passed'};
 try{
  assert.equal(report.complete,true);assert.equal(report.cards.length,expected.size);
  assert.equal(new Set(report.cards.map(c=>c.id)).size,expected.size,'Duplicate card entity');
  assert.deepEqual(report.missing,[]);assert.equal(report.loadout.stats.valid,true);
  assert.equal(hash(path.join(out,report.back.file)),hash('webapp'+GWENT_ART['back:'+report.faction]),'Back changed');
  for(const card of report.cards){
   const c=expected.get(card.id);assert.ok(c,'Unknown card '+card.id);
   assert.equal(card.name,c.name,'Name '+card.id);assert.equal(card.kind,kind(c),'Kind '+card.id);
   assert.equal(card.strength,c.strength??null,'Strength '+card.id);assert.equal(card.copies,c.copies,'Copies '+card.id);assert.deepEqual(card.rows,c.rows||[],'Rows '+card.id);
   for(const key of ['file','webp']){const m=await sharp(path.join(out,card[key])).metadata();assert.equal(m.width,310);assert.equal(m.height,585);}
   const face=await raw(path.join(out,card.file));
   if(card.reuse){
    result.reused++;for(const key of ['file','webp'])assert.equal(hash(path.join(out,card[key])),hash(path.resolve(out,card.reuse,card[key])),'Reused face changed');
    continue;
   }
   if(card.source==='existing supplied card'){
    const source=await raw('webapp'+GWENT_ART[card.id]);assert.ok(face.data.equals(source.data),'Supplied print changed '+card.id);continue;
   }
   if(card.nativePatch){
    result.patched++;const p=card.nativePatch;
    assert.deepEqual(p,spec.nativePatches?.[card.id],'Unplanned native patch '+card.id);
    const source=await raw('webapp'+GWENT_ART[card.id]);
    for(let y=0;y<585;y++)for(let x=0;x<310;x++){
     if((p.strength&&Math.hypot(x-44,y-44)<=31)||(p.ability&&x<81&&y>=253&&y<334))continue;
     const at=(y*310+x)*4;
     for(let channel=0;channel<4;channel++)assert.equal(face.data[at+channel],source.data[at+channel],'Changed source outside badge '+card.id);
    }
    if(p.strength){assert.equal(p.strength,c.strength);result.badgePixelsChecked+=await badge(face,path.join(out,`layers/power-unit-${c.strength}.png`),0,0,(x,y)=>Math.hypot(x-44,y-44)<25);}
    if(p.ability){assert.ok(icons(c).includes(p.ability));result.badgePixelsChecked+=await badge(face,path.join(out,`layers/ability-${p.ability}.png`),0,253,(x,y)=>Math.hypot(x-44,y-38)<28);}
    continue;
   }
   result.newIllustrations++;
   const metrics=report.textMetrics.find(m=>m.id===card.id);assert.ok(metrics,'No text record '+card.id);assert.equal(metrics.title.text,c.name,'Printed title '+card.id);
   assert.equal(metrics.quote.text,card.quote);assert.ok(metrics.title.lines<=2&&metrics.quote.lines<=3,'Text overflow');
   if(c.type==='unit'){
    assert.deepEqual(card.abilities,icons(c),'Ability mapping '+card.id);
    const file=c.hero&&c.strength===10?'power-hero-10-clean-v2.png':`power-${c.hero?'hero':'unit'}-${c.strength}.png`;
    result.badgePixelsChecked+=await badge(face,path.join(out,'layers',file),0,0);
    for(const [i,a]of icons(c).entries())result.badgePixelsChecked+=await badge(face,path.join(out,`layers/ability-${a}.png`),0,253+i*82);
   }else if(c.type==='special'){
    const a=spec.effects?.[c.id]||defaults[c.id];assert.ok(a,'No expected effect '+c.id);assert.deepEqual(card.abilities,[a]);
    result.badgePixelsChecked+=await badge(face,path.join(out,`layers/effect-${specialIconName(c.id,a)}.png`),0,0);
   }
  }
 }catch(error){result.status='failed';result.error=error.message;summary.issues.push({folder:name,error:error.message});summary.status='failed';}
 summary.packages.push(result);console.log(JSON.stringify(result));
}
summary.totalFaces=summary.packages.reduce((n,p)=>n+p.faces,0);
const suppliedJobs=JSON.parse(fs.readFileSync(path.join(root,'templates-v1/art-audit.json'))).jobs;
const completed=new Set(summary.packages.flatMap(p=>JSON.parse(fs.readFileSync(path.join(root,p.folder,'deck-manifest.json'))).cards.map(c=>c.id)));
summary.remainingArtJobs=suppliedJobs.filter(j=>!j.key.startsWith('back-')&&!completed.has(j.key.replace(/^extended-/,''))).map(j=>j.key);
if(summary.remainingArtJobs.length){summary.status='failed';summary.issues.push({remainingArtJobs:summary.remainingArtJobs});}
fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify(summary,null,2));
if(summary.issues.length)process.exitCode=1;
