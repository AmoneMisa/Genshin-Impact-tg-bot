import fs from 'node:fs';
import path from 'node:path';
import {createRequire}from 'node:module';
import {GWENT_ART}from '../../../webapp/gwent-art.js';
const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json');
const sharp=require('sharp');

export async function prepareLayers(directory,faction,glyphs={}){
 const out=path.resolve(directory),approved=path.resolve(out,'../wild-hunt-v1');
 fs.mkdirSync(path.join(out,'layers'),{recursive:true});fs.mkdirSync(path.join(out,'fonts'),{recursive:true});
 for(const file of fs.readdirSync(path.join(approved,'layers'))){
  if(!file.endsWith('.png')||file==='faction-emblem.png'||file==='power-hero-10-sun.png')continue;
  fs.copyFileSync(path.join(approved,'layers',file),path.join(out,'layers',file));
 }
 for(const file of fs.readdirSync(path.join(approved,'fonts')))fs.copyFileSync(path.join(approved,'fonts',file),path.join(out,'fonts',file));
 const provenance={sharedSource:'../wild-hunt-v1/layers',sourceCommit:'7f08b270',customIcons:{}};
 for(const [name,shape]of Object.entries(glyphs)){
  const background=await sharp('webapp'+GWENT_ART['biting-frost']).extract({left:0,top:0,width:90,height:90}).png().toBuffer();
  const overlay=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 81 81"><circle cx="40.5" cy="40.5" r="29.5" fill="#eeeee3"/><g transform="translate(8.5 8.5)" fill="none" stroke="#161816" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>`);
  const file=`effect-${name}.png`;
  await sharp(background).composite([{input:overlay}]).png().toFile(path.join(out,'layers',file));
  provenance.customIcons[file]={origin:'Fan expansion vector glyph; not claimed to be an original Witcher 3 UI icon.',frameSource:GWENT_ART['biting-frost']};
 }
 const back='webapp'+GWENT_ART['back:'+faction];fs.copyFileSync(back,path.join(out,'back.webp'));
 if(faction==='witchers'||faction==='toussaint'){
  const tintCloth=(pixels,i)=>{
   const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
   if(b>r*1.15&&b>g*1.05){
    const light=.2126*r+.7152*g+.0722*b;
    const color=faction==='witchers'?[12+light*.48,15+light*.52,19+light*.57]:[35+light*.85,8+light*.22,18+light*.38];
    color.forEach((v,c)=>pixels[i+c]=Math.round(Math.min(255,v)));
   }
  };
  // Derive faction cloth from the shared frame, preserving its alpha, stitching and parchment.
  const base=path.resolve(out,'../templates-v1/unit.png');
  const {data,info}=await sharp(base).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let y=0;y<515;y++)for(let x=16;x<73;x++){
   tintCloth(data,(y*info.width+x)*4);
  }
  await sharp(data,{raw:info}).png().toFile(path.join(out,'layers/unit-frame.png'));
  // Original icon crops include small pieces of blue cloth behind the circular medals.
  for(const file of fs.readdirSync(path.join(out,'layers')).filter(n=>/^(row-|ability-|power-unit-).*\.png$/.test(n))){
   const target=path.join(out,'layers',file),raw=await sharp(target).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   for(let i=0;i<raw.data.length;i+=4)tintCloth(raw.data,i);
   const png=await sharp(raw.data,{raw:raw.info}).png().toBuffer();fs.writeFileSync(target,png);
  }
  provenance.frame={source:'../templates-v1/unit.png',cloth:(faction==='witchers'?'graphite and steel':'wine burgundy')+'; existing stitching and parchment preserved'};
  if(faction==='witchers'){
  // Trace the whole silver medallion, excluding the surrounding belt. Keep dark facial details opaque.
  const points='106,166 128,186 140,176 151,184 169,181 185,184 200,176 210,185 234,164 229,198 244,209 230,220 257,239 223,245 250,282 214,270 214,300 191,280 183,319 157,319 151,280 126,303 130,269 89,282 119,249 84,240 114,220 94,210 115,202';
  const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="340" height="510"><polygon points="${points}" fill="white"/></svg>`);
  const source=await sharp(back).resize(340,510).ensureAlpha().png().toBuffer();
  const medallion=await sharp(source).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  await sharp(medallion).trim().resize(38,39,{fit:'contain',background:'#00000000'}).png().toFile(path.join(out,'layers/faction-emblem.png'));
  provenance.emblem={source:back,extraction:'Complete central wolf silhouette; transparent fixed-size canvas',canvas:[38,39]};
  }else{
   const crop={left:26,top:22,width:51,height:58};
   const silhouette=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="340" height="510"><polygon points="50,24 61,41 56,53 63,43 71,45 75,55 68,62 66,53 61,52 55,62 59,63 59,67 53,67 57,74 53,77 50,80 47,76 43,74 47,67 40,67 40,63 45,62 39,52 34,53 33,61 28,56 28,48 33,43 39,43 45,54 41,42 43,33" fill="white"/></svg>');
   const masked=await sharp(back).ensureAlpha().composite([{input:silhouette,blend:'dest-in'}]).png().toBuffer();
   const {data:pixels,info:meta}=await sharp(masked).extract(crop).raw().toBuffer({resolveWithObject:true});
   for(let i=0;i<pixels.length;i+=4){
    if(!(pixels[i]>pixels[i+2]*1.3&&pixels[i+1]>pixels[i+2]*1.1&&pixels[i]>75))pixels[i+3]=0;
   }
   await sharp(pixels,{raw:meta}).trim().resize(38,39,{fit:'contain',background:'#00000000'}).png().toFile(path.join(out,'layers/faction-emblem.png'));
   provenance.emblem={source:back,crop,extraction:'Complete gold fleur-de-lis from the ready back; silhouette mask excludes surrounding frame',canvas:[38,39]};
  }
 }else{
 const m=await sharp(back).metadata(),crop={left:Math.round(m.width*.28),top:Math.round(m.height*.34),width:Math.round(m.width*.44),height:Math.round(m.height*.34)};
 const {data,info}=await sharp(back).extract(crop).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4){const v=Math.min(data[i],data[i+1],data[i+2]);data[i+3]=v<130?0:Math.min(255,(v-130)*4);}
 await sharp(data,{raw:info}).trim().resize(34,47,{fit:'inside'}).png().toFile(path.join(out,'layers/faction-emblem.png'));
 provenance.emblem={source:back,crop};
 }
 provenance.back={source:back,reusedUnchanged:true};
 fs.writeFileSync(path.join(out,'layers/provenance.json'),JSON.stringify(provenance,null,2));
 console.log('Shared layers, custom glyphs and existing back prepared: '+faction);
}
