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
 // The original ability crop is asymmetric: its medal is centered at (44,38), not (40.5,40.5).
 // Clear the complete old heart silhouette, then center each 64-unit glyph on the medal itself.
 const unitGlyphs={
  mage:'<circle cx="32" cy="32" r="12"/><path d="M32 12v6m0 28v6M12 32h6m28 0h6M17 17l5 5m20 20 5 5M17 47l5-5m20-20 5-5"/>',
  swap:'<path d="M17 22h26l-6-6m6 6-6 6M47 42H21l6 6m-6-6 6-6"/><path d="M17 31v9h9M47 33v-9h-9"/>'
 };
 for(const [name,shape]of Object.entries(unitGlyphs)){
  const background=path.join(out,'layers/ability-medic.png');
  const overlay=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81"><circle cx="44" cy="38" r="30.5" fill="#eeeee3"/><g transform="translate(12 6)" fill="none" stroke="#161816" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>`);
  await sharp(background).composite([{input:overlay}]).png().toFile(path.join(out,`layers/ability-${name}.png`));
  provenance.customIcons[`ability-${name}.png`]={origin:'Custom fan expansion vector glyph, rasterized; not an original Witcher 3 icon',frameSource:'../templates-v1/layers/ability-medic.png',medalCenter:[44,38],glyphCenter:[44,38]};
 }
 for(const [name,shape]of Object.entries(glyphs)){
  const background=await sharp('webapp'+GWENT_ART['biting-frost']).extract({left:0,top:0,width:90,height:90}).png().toBuffer();
  const overlay=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 81 81"><circle cx="40.5" cy="40.5" r="29.5" fill="#eeeee3"/><g transform="translate(8.5 8.5)" fill="none" stroke="#161816" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>`);
  const file=`effect-${name}.png`;
  await sharp(background).composite([{input:overlay}]).png().toFile(path.join(out,'layers',file));
  provenance.customIcons[file]={origin:'Fan expansion vector glyph; not claimed to be an original Witcher 3 UI icon.',frameSource:GWENT_ART['biting-frost']};
 }
 // Source-card ability crops contain cloth/portrait pixels beyond the medal.
 // Keep only the actual circular medal at its original asymmetric crop center.
 for(const file of fs.readdirSync(path.join(out,'layers')).filter(n=>/^ability-.*\.png$/.test(n))){
  const target=path.join(out,'layers',file);
  const mask=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81"><circle cx="44" cy="38" r="36.5" fill="white"/></svg>');
  const clean=await sharp(target).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  fs.writeFileSync(target,clean);
 }
 provenance.abilityMask={center:[44,38],radius:36.5,canvas:[81,81],purpose:'Remove source-card cloth and portrait outside the original medal; no added border'};
 const back='webapp'+GWENT_ART['back:'+faction];fs.copyFileSync(back,path.join(out,'back.webp'));
 if(['witchers','toussaint','velen','redania','sorceresses','eternal-fire'].includes(faction)){
  const tintCloth=(pixels,i)=>{
   const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
   if(b>r*1.15&&b>g*1.05){
    const light=.2126*r+.7152*g+.0722*b;
    const colors={witchers:[12+light*.48,15+light*.52,19+light*.57],toussaint:[35+light*.85,8+light*.22,18+light*.38],velen:[14+light*.42,20+light*.48,10+light*.25],redania:[28+light*.88,4+light*.12,7+light*.17],sorceresses:[22+light*.4,10+light*.16,39+light*.8],'eternal-fire':[40+light*.95,17+light*.48,7+light*.16]};
    const color=colors[faction];
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
  provenance.frame={source:'../templates-v1/unit.png',cloth:({witchers:'graphite and steel',toussaint:'wine burgundy',velen:'swamp olive',redania:'dark crimson',sorceresses:'deep plum violet','eternal-fire':'charred copper and ember ochre'}[faction])+'; existing stitching and parchment preserved'};
  if(faction==='witchers'){
  // Trace the whole silver medallion, excluding the surrounding belt. Keep dark facial details opaque.
  const points='106,166 128,186 140,176 151,184 169,181 185,184 200,176 210,185 234,164 229,198 244,209 230,220 257,239 223,245 250,282 214,270 214,300 191,280 183,319 157,319 151,280 126,303 130,269 89,282 119,249 84,240 114,220 94,210 115,202';
  const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="340" height="510"><polygon points="${points}" fill="white"/></svg>`);
  const source=await sharp(back).resize(340,510).ensureAlpha().png().toBuffer();
  const medallion=await sharp(source).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  await sharp(medallion).trim().resize(38,39,{fit:'contain',background:'#00000000'}).png().toFile(path.join(out,'layers/faction-emblem.png'));
  provenance.emblem={source:back,extraction:'Complete central wolf silhouette; transparent fixed-size canvas',canvas:[38,39]};
  }else if(faction==='toussaint'){
   const crop={left:26,top:22,width:51,height:58};
   const silhouette=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="340" height="510"><polygon points="50,24 61,41 56,53 63,43 71,45 75,55 68,62 66,53 61,52 55,62 59,63 59,67 53,67 57,74 53,77 50,80 47,76 43,74 47,67 40,67 40,63 45,62 39,52 34,53 33,61 28,56 28,48 33,43 39,43 45,54 41,42 43,33" fill="white"/></svg>');
   const masked=await sharp(back).ensureAlpha().composite([{input:silhouette,blend:'dest-in'}]).png().toBuffer();
   const {data:pixels,info:meta}=await sharp(masked).extract(crop).raw().toBuffer({resolveWithObject:true});
   for(let i=0;i<pixels.length;i+=4){
    if(!(pixels[i]>pixels[i+2]*1.3&&pixels[i+1]>pixels[i+2]*1.1&&pixels[i]>75))pixels[i+3]=0;
   }
   await sharp(pixels,{raw:meta}).trim().resize(38,39,{fit:'contain',background:'#00000000'}).png().toFile(path.join(out,'layers/faction-emblem.png'));
   provenance.emblem={source:back,crop,extraction:'Complete gold fleur-de-lis from the ready back; silhouette mask excludes surrounding frame',canvas:[38,39]};
  }else if(faction==='velen'){
   const crop={left:83,top:153,width:175,height:176};
   const {data:pixels,info:meta}=await sharp(back).extract(crop).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   // Geometric silhouette keeps the original dark face and jaw opaque instead of deleting them by brightness.
   const contour='236,260 219,274 205,245 198,222 202,202 211,181 225,164 210,171 196,184 185,180 187,158 194,136 181,153 173,179 176,210 185,240 173,227 144,215 127,200 118,179 117,151 128,124 146,100 160,94 179,85 188,70 193,55 177,74 153,82 143,81 150,57 161,33 176,10 160,20 145,37 133,60 130,88 116,110 102,127 93,141 83,135 78,121 80,103 84,92 74,104 70,122 71,138 76,153 64,135 57,114 58,91 66,66 77,46 61,61 50,86 45,111 48,141 58,171 77,198 76,204 55,206 37,198 25,183 19,162 18,141 11,153 11,180 16,204 29,220 54,227 85,229 109,237 128,247 125,260 105,267 86,265 72,257 65,250 74,270 93,285 112,288 139,280 161,283 183,292 204,308 218,296 209,322 194,339 188,356 191,380 203,393 216,398 220,420 224,455 233,486 245,517 258,523 274,516 287,487 295,458 300,424 308,398 324,392 335,378 339,352 330,337 313,323 304,298 320,309 342,293 365,283 392,280 420,288 443,281 458,264 463,250 450,265 436,272 417,272 401,263 394,250 421,238 450,230 476,227 494,217 505,201 514,174 514,143 508,162 501,185 486,199 464,207 446,204 448,191 461,171 473,145 478,117 474,88 464,63 447,46 459,72 465,103 459,125 447,143 444,125 447,107 440,91 441,116 435,135 428,141 417,129 405,111 391,92 392,65 381,40 366,22 347,10 361,29 371,53 377,79 366,81 349,75 330,55 336,74 351,87 370,95 389,117 401,144 401,175 392,196 376,211 352,220 337,231 343,212 350,188 348,162 337,138 342,165 337,185 327,199 321,183 308,172 296,166 311,183 317,207 314,237 302,264 289,276 285,259 265,263 249,261';
   const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="175" height="176" viewBox="0 0 525 528"><polygon points="${contour}" fill="white"/></svg>`);
   const silhouette=await sharp(pixels,{raw:meta}).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
   await sharp(silhouette).trim().resize(34,36,{fit:'contain',background:'#00000000'}).png().toFile(path.join(out,'layers/faction-emblem.png'));
   provenance.emblem={source:back,crop,extraction:'Complete antlered skull silhouette; original face, jaw and internal shading kept opaque, no brightness threshold',canvas:[34,36]};
  }else if(faction==='redania'){
   const crop={left:82,top:153,width:176,height:177};
   const {data:pixels,info:meta}=await sharp(back).extract(crop).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   for(let y=0;y<meta.height;y++)for(let x=0;x<meta.width;x++){
    const i=(y*meta.width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
    // Chroma isolates red cloth; unlike a brightness mask it preserves the eagle's dark facial details.
    if(Math.hypot(x+crop.left-170,y+crop.top-245)>99||(r>g*1.7&&r>b*1.8))pixels[i+3]=0;
   }
   await sharp(pixels,{raw:meta}).trim().resize(34,36,{fit:'contain',background:'#00000000'}).png().toFile(path.join(out,'layers/faction-emblem.png'));
   provenance.emblem={source:back,crop,extraction:'White crowned eagle and gold feet from the ready back; red-cloth chroma removed, dark details retained',canvas:[34,36]};
  }else if(faction==='sorceresses'){
   const points='170,159 184,211 226,184 199,224 251,240 199,254 226,296 184,269 170,320 157,269 112,296 139,254 90,240 139,225 112,184 157,211';
   const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="340" height="510"><polygon points="${points}" fill="white"/></svg>`);
   const source=await sharp(back).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
   await sharp(source).trim().resize(34,36,{fit:'contain',background:'#00000000'}).png().toFile(path.join(out,'layers/faction-emblem.png'));
   provenance.emblem={source:back,extraction:'Whole eight-point star and violet central jewel; geometric silhouette retains original dark shading',canvas:[34,36]};
  }else{
   const crop={left:85,top:151,width:170,height:180};
   const {data:pixels,info:meta}=await sharp(back).extract(crop).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   for(let y=0;y<meta.height;y++)for(let x=0;x<meta.width;x++){
    const i=(y*meta.width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
    if(Math.hypot(x+crop.left-170,y+crop.top-242)>99||(r>g*1.7&&r>b*1.8))pixels[i+3]=0;
   }
   await sharp(pixels,{raw:meta}).trim().resize(34,36,{fit:'contain',background:'#00000000'}).png().toFile(path.join(out,'layers/faction-emblem.png'));
   provenance.emblem={source:back,crop,extraction:'Original gold flame, bowl and rays from ready back; red cloth and outside belt removed',canvas:[34,36]};
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
