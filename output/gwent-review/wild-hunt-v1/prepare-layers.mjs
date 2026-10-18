import {combinedWeatherIcons,doubleWeatherIcon,medicSpecialIcon} from '../shared/special-icon.mjs';
import {extractHeroMedallion} from './extract-hero-medallion.mjs';
import fs from'node:fs';import path from'node:path';import{createRequire}from'node:module';import{GWENT_ART}from'../../../webapp/gwent-art.js';
const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json');const sharp=require('sharp');
const out=path.resolve('output/gwent-review/wild-hunt-v1'),base=path.resolve('output/gwent-review/templates-v1');
fs.mkdirSync(path.join(out,'layers'),{recursive:true});
for(const file of fs.readdirSync(path.join(base,'layers')))fs.copyFileSync(path.join(base,'layers',file),path.join(out,'layers',file));
const circle=(n)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}"><circle cx="${n/2}" cy="${n/2}" r="${n/2}" fill="white"/></svg>`);
await sharp('webapp'+GWENT_ART.ciaran).extract({left:0,top:154,width:81,height:81}).composite([{input:circle(81),blend:'dest-in'}]).png().toFile(path.join(out,'layers/row-agile.png'));
const glyphs={swap:'<path d="M17 22h26l-6-6m6 6-6 6M47 42H21l6 6m-6-6 6-6"/><path d="M17 31v9h9M47 33v-9h-9"/>',mage:'<circle cx="32" cy="31" r="12"/><path d="M32 11v6m0 28v7M12 31h6m28 0h6M17 16l5 5m20 20 5 5M17 46l5-5m20-20 5-5"/>',fire:'<path d="M34 9c1 12 14 15 14 29a16 16 0 0 1-32 0c0-9 6-16 12-23-1 12 0 15 4 17 4-7 5-14 2-23Z" fill="#161816" stroke="none"/>',earth:'<path d="m10 45 16-29 10 18 7-12 13 23Z"/><path d="m16 48 12 6 12-6 10 4"/>',water:'<path d="M32 9c-3 10-16 22-16 31a16 16 0 0 0 32 0c0-9-13-21-16-31Z"/><path d="M23 40c0 6 3 9 8 10"/>',prep:'<path d="M14 51h38M22 51l10-26 11 26M13 17l39 16M33 26l8-17M45 34l8 12"/><circle cx="32" cy="25" r="4"/>',trap:'<path d="m10 39 6-15 6 9 6-15 7 15 7-9 11 16M10 39l9 12h25l9-12M18 51v-8m12 8V39m12 12v-9"/>',recall:null};
const provenance={};
for(const [name,shape]of Object.entries(glyphs)){
 if(name==='recall'){
  const src=await sharp('webapp'+GWENT_ART['biting-frost']).extract({left:0,top:0,width:90,height:90}).png().toBuffer();
  fs.writeFileSync(path.join(out,'layers/effect-recall.png'),await medicSpecialIcon(src));
  provenance['effect-recall.png']={origin:'Original supplied Witcher 3 medic heart and white cross inside special-card gold roundel',source:'templates-v1/layers/ability-medic.png'};
  continue;
 }
 const unit=['mage','swap'].includes(name),size=unit?81:90;
 const src=unit?await sharp(path.join(base,'layers/ability-medic.png')).png().toBuffer():await sharp('webapp'+GWENT_ART['biting-frost']).extract({left:0,top:0,width:90,height:90}).png().toBuffer();
 const overlay=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 81 81"><circle cx="40.5" cy="40.5" r="29.5" fill="#eeeeE3"/><g transform="translate(8.5 8.5)" fill="none" stroke="#161816" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>`);
 const file=`${unit?'ability':'effect'}-${name}.png`;await sharp(src).composite([{input:overlay}]).png().toFile(path.join(out,'layers',file));
 provenance[file]={origin:'Custom icon for fan expansion, not an original Witcher 3 client icon',commonBorderSource:unit?'templates-v1/layers/ability-medic.png':GWENT_ART['biting-frost'],representation:name};
}
fs.writeFileSync(path.join(out,'layers/effect-double-weather.png'),await doubleWeatherIcon());
 for(const[name,icon]of Object.entries(await combinedWeatherIcons()))fs.writeFileSync(path.join(path.join(out,'layers'),'effect-'+name+'.png'),icon);
provenance['effect-double-weather.png']={origin:'Original Skellige Storm double-weather roundel',source:'/art/gwent/printed/skel_spec2.webp',crop:[0,0,90,90]};
const back='webapp'+GWENT_ART['back:wild-hunt'];fs.copyFileSync(back,path.join(out,'back.webp'));
const meta=await sharp(back).metadata();const crop={left:Math.round(meta.width*.28),top:Math.round(meta.height*.35),width:Math.round(meta.width*.44),height:Math.round(meta.height*.30)};
const {data,info}=await sharp(back).extract(crop).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<data.length;i+=4){const v=Math.min(data[i],data[i+1],data[i+2]);data[i+3]=v<130?0:Math.min(255,(v-130)*4);}
await sharp(data,{raw:info}).trim().resize(34,47,{fit:'inside'}).png().toFile(path.join(out,'layers/faction-emblem.png'));
fs.writeFileSync(path.join(out,'layers/provenance.json'),JSON.stringify({customIcons:provenance,rowAgile:{source:GWENT_ART.ciaran,crop:{left:0,top:154,width:81,height:81}},emblem:{source:back,crop},back:{source:back,status:'Existing finished back reused unchanged'}},null,2));
console.log('Prepared shared layers, custom expansion icons, and unchanged existing back.');



// Source pixels stay opaque inside gold; only the outside becomes transparent.
await extractHeroMedallion('webapp'+GWENT_ART.vernon,path.join(out,'layers/power-hero-10-clean-v2.png'));
