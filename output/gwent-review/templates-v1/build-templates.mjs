import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {EXTENDED_DECKS,GWENT_DECKS} from '../../../webapp/gwent-decks.js';
import {GWENT_ART} from '../../../webapp/gwent-art.js';
const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json');
const sharp=require('sharp');
const out=path.resolve('output/gwent-review/templates-v1');
fs.mkdirSync(path.join(out,'layers'),{recursive:true});
const W=310,H=585;
const svg=s=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s}</svg>`);
const rounded=svg('<rect width="310" height="585" rx="13" fill="white"/>');
const manifest={version:1,status:'review',size:{width:W,height:H},notIntegrated:true,
 layout:{illustration:{x:0,y:0,width:310,height:435},parchment:{x:0,y:435,width:310,height:150},name:{x:82,y:451,width:220,height:48},quote:{x:8,y:522,width:294,height:55},power:{x:0,y:0,width:90,height:90},row:{x:0,y:154,width:80,height:80},abilities:{x:0,y:253,width:80,height:80}},
 fields:{name:'card.name',power:'card.strength',quote:null,row:'card.rows',abilities:'icons only'},
 rules:['Quote is literary text only; empty when absent.','Never place traits, card type, row names, rules or ability descriptions in quote.','Icons are raster assets, never font glyphs.','No extra outer gold border.','Every layer has one common position; no individual card CSS adjustments.'],
 templates:[],icons:{},powers:{},unverified:['AI parchment and ribbon texture are draft material, not a pixel-for-pixel extraction.','Exact title and quotation typeface has not been verified; text is not baked into templates.'],
};
for(const kind of ['unit','hero','special','leader']){
 const generated=await sharp(path.join(out,'materials',kind+'.png')).resize(W,H,{fit:'fill'}).png().toBuffer();
 const paper=await sharp(generated).extract({left:kind==='unit'?80:7,top:443,width:kind==='unit'?223:296,height:135}).resize(W,150,{fit:'fill'}).png().toBuffer();
 const source='webapp/art/gwent/printed/'+(kind==='hero'?'neit_h4.webp':kind==='leader'?'lid_k3.webp':kind==='special'?'spec_p1.webp':'sev_10.webp');
 const separator=await sharp(source).extract({left:0,top:434,width:310,height:5}).png().toBuffer();
 const parts=[{input:paper,left:0,top:435},{input:separator,left:0,top:434}];
 if(kind==='unit'){
  const ribbon=await sharp(generated).extract({left:10,top:5,width:58,height:523}).resize(56,515,{fit:'fill'}).png().toBuffer();
  parts.push({input:ribbon,left:16,top:0});
 }
 let frame=await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(parts).png().toBuffer();
 frame=await sharp(frame).composite([{input:rounded,blend:'dest-in'}]).png().toBuffer();
 fs.writeFileSync(path.join(out,kind+'.png'),frame);
 const alpha=await sharp(frame).ensureAlpha().raw().toBuffer();
 if(alpha[(200*W+150)*4+3]!==0)throw Error('Portrait window must be transparent '+kind);
 if(alpha[(560*W+150)*4+3]<250)throw Error('Quote paper must be opaque '+kind);
 manifest.templates.push({kind,file:kind+'.png',quote:'',textBaked:false,powerBaked:false});
}
await sharp(path.join(out,'materials','back.png')).resize(W,H,{fit:'fill'}).png().toFile(path.join(out,'back.png'));
manifest.templates.push({kind:'back',file:'back.png',emblem:null});
for(const row of ['close','ranged','siege']){
 const filename=`row-${row}.png`;
 fs.copyFileSync(`webapp/art/gwent/icons/card_row_${row}.png`,path.join(out,'layers',filename));
 manifest.icons[row]={file:'layers/'+filename,source:`webapp/art/gwent/icons/card_row_${row}.png`};
}
const circleMask=(w,h)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><ellipse cx="${w/2}" cy="${h/2}" rx="${w/2}" ry="${h/2}" fill="white"/></svg>`);
for(const [ability,id]of Object.entries({bond:'blue-stripes',spy:'thaler',medic:'dun-banner-medic',morale:'kaedweni-expert',muster:'gaunter',horn:'dandelion',scorch:'villentretemerth'})){
 const src='webapp'+GWENT_ART[id],file=`layers/ability-${ability}.png`;
 await sharp(src).extract({left:0,top:253,width:81,height:81}).composite([{input:circleMask(81,81),blend:'dest-in'}]).png().toFile(path.join(out,file));
 manifest.icons[ability]={file,source:src,sourceCard:id,crop:{left:0,top:253,width:81,height:81}};
}
const candidates=[...new Map(Object.values(GWENT_DECKS).flatMap(d=>d.cards.map(([c])=>[c.id,c]))).values()];
for(const c of candidates){
 if(c.type!=='unit'||!GWENT_ART[c.id]||!GWENT_ART[c.id].includes('/printed/'))continue;
 const key=(c.hero?'hero-':'unit-')+c.strength;if(manifest.powers[key])continue;
 const file=`layers/power-${key}.png`;
 await sharp('webapp'+GWENT_ART[c.id]).extract({left:0,top:0,width:90,height:90}).composite([{input:circleMask(90,90),blend:'dest-in'}]).png().toFile(path.join(out,file));
 manifest.powers[key]={file,sourceCard:c.id,value:c.strength,hero:!!c.hero};
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
// art-audit.json is a snapshot of the deck catalog taken during the audit.
fs.writeFileSync(path.join(out,'README.md'),`# Gwent template review v1\n\nPreview only. No game assets are replaced. No commit or push.\n\n310 × 585 pixels, matching supplied source dimensions. Illustration beneath frame; power, row, abilities, faction emblem, name and quote are independent layers. Quote is literary text only and remains empty when absent. Mechanics must never populate it.\n\nGenerated materials: built-in image_gen, original supplied cards as references. The generative outer gold perimeter was removed from these composited templates; only the original horizontal separator is retained. The center illustration window has verified alpha.\n\nThis is a draft base, not a verified pixel-perfect replica. Typeface, exact ribbon texture and extracted ability crops need visual sign-off. New custom abilities have no original client icon; no unrelated icons are assigned.\n\nAudit: 156 unique missing faces, five existing faces with changed printed data in extended rules, seven faction backs currently represented by SVG crests. See art-audit.json.\n`);
console.log(JSON.stringify({out,templates:manifest.templates.length,icons:Object.keys(manifest.icons).length,powers:Object.keys(manifest.powers).length,verifiedPortraitAlpha:true}));
