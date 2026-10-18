import {createRequire} from 'node:module';
const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json');
const sharp=require('sharp');

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
