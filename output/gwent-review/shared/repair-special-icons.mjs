import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {cleanSpecialIcon,specialIconCircle,medicSpecialIcon,combinedWeatherIcons,doubleWeatherIcon,specialIconName} from './special-icon.mjs';
const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright'),sharp=require('sharp');
const root=fileURLToPath(new URL('..',import.meta.url));
const packages=fs.readdirSync(root).map(n=>path.join(root,n)).filter(p=>fs.existsSync(path.join(p,'deck-manifest.json')));
const url=file=>'data:image/png;base64,'+fs.readFileSync(file).toString('base64');
const manifests=new Map(packages.map(p=>[p,JSON.parse(fs.readFileSync(path.join(p,'deck-manifest.json')))]));
const changed=new Set(),checks=[];
const selectedEffect=process.argv.find(a=>a.startsWith('--effect='))?.slice(9);
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{
 const page=await browser.newPage();await page.setContent('<canvas></canvas>');
 for(const [folder,manifest]of manifests){
  const layers=path.join(folder,'layers');
  fs.writeFileSync(path.join(layers,'effect-double-weather.png'),await doubleWeatherIcon());
 for(const[name,icon]of Object.entries(await combinedWeatherIcons()))fs.writeFileSync(path.join(layers,'effect-'+name+'.png'),icon);
  for(const file of fs.readdirSync(layers).filter(n=>/^effect-.*\.png$/.test(n))){const target=path.join(layers,file);fs.writeFileSync(target,await (file==='effect-recall.png'?medicSpecialIcon(target):cleanSpecialIcon(target)));}
  const provenanceFile=path.join(layers,'provenance.json');
  if(fs.existsSync(provenanceFile)){const provenance=JSON.parse(fs.readFileSync(provenanceFile));provenance.specialIconMask={...specialIconCircle,purpose:'Remove source scenery outside gold roundels'};provenance.customIcons ||= {};provenance.customIcons['effect-recall.png']={origin:'Original supplied Witcher 3 medic heart and white cross, raster core inside special-card gold roundel',source:'../templates-v1/layers/ability-medic.png'};fs.writeFileSync(provenanceFile,JSON.stringify(provenance,null,2));}
  const provenance=JSON.parse(fs.readFileSync(provenanceFile));provenance.nativeIcons ||= {};provenance.nativeIcons['weather-pairs']={sources:['/art/gwent/printed/spec_p1.webp','/art/gwent/printed/spec_p2.webp','/art/gwent/printed/spec_p3.webp'],composition:'Original raster frost + fog for close/ranged; original frost + rain for close/siege; new combinations, not original CDPR composite icons'};provenance.nativeIcons['effect-double-weather.png']={source:'/art/gwent/printed/skel_spec2.webp',crop:[0,0,90,90],extraction:'Original Skellige Storm roundel; only scenery outside gold rim removed'};fs.writeFileSync(provenanceFile,JSON.stringify(provenance,null,2));
  for(const card of manifest.cards.filter(c=>c.kind==='special'&&c.quoteOrigin==='fan-written'&&!c.reuse&&(!selectedEffect||specialIconName(c.id,c.abilities[0])===selectedEffect||(selectedEffect==='weather'&&['el-fire','el-earth','el-water'].includes(c.id))))){
   const art=path.join(folder,'illustrations',card.id+'.png'),icon=path.join(layers,'effect-'+specialIconName(card.id,card.abilities[0])+'.png');
   if(!fs.existsSync(art)||!fs.existsSync(icon))throw Error('Missing source layer for '+card.id);
   const target=path.join(folder,card.file),before=await sharp(target).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const base64=await page.evaluate(async({old,art,frame,icon})=>{
    const canvas=document.querySelector('canvas');canvas.width=310;canvas.height=585;const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const load=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
    ctx.drawImage(await load(old),0,0);
    ctx.save();ctx.beginPath();ctx.rect(0,0,90,90);ctx.clip();ctx.clearRect(0,0,90,90);
    const pic=await load(art),scale=Math.max(310/pic.width,435/pic.height),w=pic.width*scale,h=pic.height*scale;
    ctx.drawImage(pic,(310-w)/2,(435-h)/2,w,h);
    ctx.drawImage(await load(frame),0,0,310,585);ctx.drawImage(await load(icon),0,0,90,90);ctx.restore();
    ctx.globalCompositeOperation='destination-in';ctx.beginPath();ctx.roundRect(0,0,310,585,13);ctx.fill();
    return canvas.toDataURL('image/png').split(',')[1];
   },{old:url(target),art:url(art),frame:url(path.join(root,'templates-v1/special.png')),icon:url(icon)});
   const patched=await sharp(Buffer.from(base64,'base64')).ensureAlpha().raw().toBuffer();
   // Preserve every original byte outside the icon square, including transparent RGB.
   for(let y=0;y<585;y++)for(let x=0;x<310;x++)if(x>=90||y>=90){const i=(y*310+x)*4;before.data.copy(patched,i,i,i+4);}
   for(let y=90;y<585;y++){const i=y*310*4;assert.ok(before.data.subarray(i,i+310*4).equals(patched.subarray(i,i+310*4)),'portrait or quote changed');}
   await sharp(patched,{raw:before.info}).png().toFile(target);
   await sharp(target).webp({quality:92,alphaQuality:100}).toFile(path.join(folder,card.webp));
   checks.push({package:path.basename(folder),id:card.id,changeRegion:[0,0,90,90],outsideUnchanged:true});changed.add(folder);
  }
 }
 // Keep each shared face identical to its canonical source, with no new card entities.
 for(const[folder,manifest]of manifests)for(const card of manifest.cards.filter(c=>c.reuse&&c.kind==='special')){
  const source=path.resolve(folder,card.reuse);if(!changed.has(source))continue;
  for(const field of ['file','webp'])fs.copyFileSync(path.join(source,card[field]),path.join(folder,card[field]));
  changed.add(folder);
 }
 for(const folder of changed){
  const manifest=manifests.get(folder),faces=[...manifest.cards.map(c=>path.join(folder,c.file)),path.join(folder,manifest.back.file)];
  const cols=9,gap=12,pad=24,w=155,h=293,rows=Math.ceil(faces.length/cols);
  const tiles=await Promise.all(faces.map(async(file,i)=>({input:await sharp(file).resize(w,h,{fit:'fill'}).png().toBuffer(),left:pad+i%cols*(w+gap),top:pad+Math.floor(i/cols)*(h+gap)})));
  await sharp({create:{width:pad*2+cols*w+(cols-1)*gap,height:pad*2+rows*h+(rows-1)*gap,channels:3,background:'#141a20'}}).composite(tiles).png().toFile(path.join(folder,'deck-contact-sheet.png'));
  const specFile=path.join(folder,'package.json');
  const previewIds=fs.existsSync(specFile)?JSON.parse(fs.readFileSync(specFile)).previewIds||[]:[];
  if(previewIds.some(id=>manifest.cards.find(c=>c.id===id)?.kind==='special')){
   const preview=previewIds.map(id=>manifest.cards.find(c=>c.id===id)).filter(Boolean);
   const pieces=await Promise.all(preview.map(async(c,i)=>({input:await sharp(path.join(folder,c.file)).resize(248,468).png().toBuffer(),left:20+i*264,top:20})));
   await sharp({create:{width:40+preview.length*248+(preview.length-1)*16,height:508,channels:3,background:'#141a20'}}).composite(pieces).png().toFile(path.join(folder,'preview.png'));
  }
 }
 fs.writeFileSync(path.join(root,`skellige-extended-v1/special-icon-fix${selectedEffect?'-'+selectedEffect:''}.json`),JSON.stringify({mask:specialIconCircle,cards:checks,packages:[...changed].map(p=>path.basename(p)),sharedCopiesIdentical:true},null,2));
 console.log(JSON.stringify({repairedSourceFaces:checks.length,packages:changed.size,checked:'Original PNG pixels outside the icon square are preserved; shared copies use canonical fixed faces'}));
}finally{await browser.close();}
