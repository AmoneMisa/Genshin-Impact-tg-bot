import {createRequire} from 'node:module';
const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json');
const sharp=require('sharp');
import {fileURLToPath} from 'node:url';

export const nativeMedicSource=fileURLToPath(new URL('../templates-v1/layers/ability-medic.png',import.meta.url));
const nativeSpecialFrameSource=fileURLToPath(new URL('../../../webapp/art/gwent/printed/spec_p1.webp',import.meta.url));
export const nativeDoubleWeatherSource=fileURLToPath(new URL('../../../webapp/art/gwent/printed/skel_spec2.webp',import.meta.url));
export const specialIconName=(cardId,effect)=>({'el-fire':'weather-frost-fog','el-earth':'weather-frost-rain','el-water':'double-weather'}[cardId]||effect);
export async function doubleWeatherIcon(){
 return cleanSpecialIcon(await sharp(nativeDoubleWeatherSource).extract({left:0,top:0,width:90,height:90}).png().toBuffer());
}
/** New combinations assembled only from supplied native weather pictograms. */
export async function combinedWeatherIcons(){
 const glyph=async source=>{
  const raw=await sharp(source).extract({left:0,top:0,width:90,height:90}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let y=0;y<90;y++)for(let x=0;x<90;x++){
   const i=(y*90+x)*4,max=Math.max(raw.data[i],raw.data[i+1],raw.data[i+2]);
   raw.data[i+3]=Math.hypot(x-44.5,y-44.5)>31.5?0:Math.min(raw.data[i+3],Math.max(0,Math.min(255,(170-max)*3)));
  }
  return sharp(raw.data,{raw:raw.info}).trim().resize(32,32,{fit:'contain',background:'#00000000'}).png().toBuffer();
 };
 const frost=await glyph(nativeSpecialFrameSource);
 const blank=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90"><circle cx="44.5" cy="44.5" r="33.5" fill="#eeeee3"/></svg>');
 const result={};
 for(const[name,file]of [['weather-frost-fog','spec_p2.webp'],['weather-frost-rain','spec_p3.webp']]){
  const second=await glyph(fileURLToPath(new URL('../../../webapp/art/gwent/printed/'+file,import.meta.url)));
  result[name]=await cleanSpecialIcon(await sharp(nativeSpecialFrameSource).extract({left:0,top:0,width:90,height:90}).composite([{input:blank},{input:frost,left:17,top:17},{input:second,left:41,top:41}]).png().toBuffer());
 }
 return result;
}
/** Use the supplied game's heart-and-cross raster, preserving the special card's gold rim. */
export async function medicSpecialIcon(){
 const coreMask=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62"><circle cx="31" cy="31" r="30.5" fill="white"/></svg>');
 const core=await sharp(nativeMedicSource).extract({left:13,top:7,width:62,height:62}).ensureAlpha().composite([{input:coreMask,blend:'dest-in'}]).png().toBuffer();
 const blank=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90"><circle cx="44.5" cy="44.5" r="33.5" fill="#eeeee3"/></svg>');
 // Rebuild from the native gold frame each time, avoiding cumulative alpha rounding.
 return cleanSpecialIcon(await sharp(nativeSpecialFrameSource).extract({left:0,top:0,width:90,height:90}).composite([{input:blank},{input:await sharp(core).resize(67,67).png().toBuffer(),left:11,top:11}]).png().toBuffer());
}

// The native weather crop includes scenery outside its gold roundel.
// Keep the roundel in its original position; discard only that surrounding scenery.
export const specialIconCircle={x:44.5,y:44.5,radius:44.5,size:90};
export async function cleanSpecialIcon(input){
 const {x,y,radius,size}=specialIconCircle;
 const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${x}" cy="${y}" r="${radius}" fill="white"/></svg>`);
 const original=await sharp(input).resize(size,size).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const alpha=await sharp(mask).ensureAlpha().raw().toBuffer();
 // Capping, rather than multiplying, also makes repeated preparation idempotent.
 for(let i=3;i<original.data.length;i+=4)original.data[i]=Math.min(original.data[i],alpha[i]);
 return sharp(original.data,{raw:original.info}).png().toBuffer();
}
