// Validate every published photo in Chromium with bounded image decoding, then capture a small contact sheet.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import sources from '../../webapp/art/npcs/l2/source.js';
import {npcPhotoUrl} from '../../webapp/art/l2-npc-art.js';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const root=path.resolve('webapp'),out=path.resolve('.tmp/npc-photos');fs.mkdirSync(out,{recursive:true});
try{
 for(const width of [320,390,1100]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const u=new URL(route.request().url()).pathname;
   if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:12px;background:#100e14;color:#e7d4ac;font:14px Georgia}main{max-width:800px;margin:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:12px}figure{margin:0;padding:8px;border:1px solid #655633;text-align:center;min-width:0}img{width:100%;height:128px;object-fit:contain}figcaption{padding:8px;overflow-wrap:anywhere}</style><main></main>'});
   const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
   return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':'image/webp',body:fs.readFileSync(file)});
  });
  await page.goto('http://npc-photos.local/fixture');
  const ids=Object.keys(sources.assets);
  if(width===320)await page.evaluate(async urls=>{
   let cursor=0;
   await Promise.all(Array.from({length:16},async()=>{
    while(cursor<urls.length){const url=urls[cursor++],img=new Image();img.src=url;await img.decode();const limit=url.includes('-128.')?128:256;if(Math.max(img.naturalWidth,img.naturalHeight)>limit)throw Error('Oversized NPC image '+url);img.src='';}
   }));
  },ids.flatMap(id=>[128,256].map(size=>npcPhotoUrl({id},size))));
  const sample=['20006','20131','20250','20563','20601','25001','25220','25325','29001','29020','29022','29068'].filter(id=>sources.assets[id]);
  await page.evaluate(async sample=>{
   const {huntMobUrl}=await import('/art/hunt-art.js');
   for(const row of sample){const figure=document.createElement('figure'),image=new Image(),caption=document.createElement('figcaption');image.src=huntMobUrl({id:row.id});caption.textContent=row.name;figure.append(image,caption);document.querySelector('main').append(figure);await image.decode();}
  },sample.map(id=>({id,name:sources.assets[id].name})));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,`original-npcs-${width}.png`),fullPage:true});await page.close();
  console.log(`PASS original NPC photos ${width}px${width===320?`: all ${ids.length*2} published images decoded`:''}`);
 }
}finally{await browser.close();}
