import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/city.css"><style>:root{--safe-bottom:0px}body{margin:0;background:#0b0d18}.app-shell{max-width:900px;margin:auto;padding:18px}.ui-icon{width:24px;height:24px}</style><main class="app-shell" id="root"></main><script type="module">
import {mountCity} from '/city.js';
const names={palace:'Башня магов',forge:'Кузница титанов',crystalLake:'Озеро кристаллов',traineeArea:'Казармы',goldMine:'Золотая шахта',ironDeposit:'Залежи руды',academy:'Академия'};
const buildings=Object.entries(names).map(([id,name],i)=>({id,name,currentLevel:i===0?4:5,maxLevel:30,nextLevel:6,currentType:id==='palace'?'royal':null,canUpgrade:true,canCollect:false,upgrading:i===0,remainingMs:8130000,upgradeStartedAt:Date.now()-1000,canSpeedup:true,speedupCost:30,upgradeCost:{gold:12000,ironOre:8000}}));
window.cityActions=[];
const city=await mountCity(document.querySelector('#root'),{api:async(url,opts)=>{
 if(url==='/api/builds')return {buildings};
 const action=JSON.parse(opts.body);window.cityActions.push(action);
 const build=buildings.find(b=>b.id===action.buildName);
 if(action.action==='upgrade'){build.currentLevel++;build.nextLevel++;}
 if(action.action==='speedup')build.upgrading=false;
 return {builds:{buildings}};
}});
window.setCityLevel=async(level)=>{buildings.forEach(b=>{b.currentLevel=level;b.nextLevel=level+1;});await city.refresh();};
</script>`;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/preview'){res.setHeader('content-type','text/html; charset=utf-8');res.end(html);return;}
 const file=path.resolve(root,'webapp','.'+url.pathname);
 if(!file.startsWith(path.join(root,'webapp')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
 for(const width of [320,390,768]){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:width===768?1:3});
  const page=await context.newPage(),requests=[],errors=[];
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/preview`);await page.waitForSelector('.city-card');await page.waitForTimeout(1200);
  assert.equal(await page.locator('.city-card').count(),7);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.ok(!requests.some(u=>/\/models\/|\.glb/.test(u)));
  const panorama=requests.filter(u=>/map-portrait-(512|768)\.webp/.test(u));assert.equal(panorama.length,1);
  assert.ok(panorama[0].endsWith(width===768?'map-portrait-512.webp':'map-portrait-768.webp'));
  assert.equal(requests.filter(u=>/builds-(512|1024)\.webp/.test(u)).length,0);
  const box=await page.locator('.city').boundingBox();assert.ok(box.width>=width-40);
  for(const img of await page.locator('.city-building-image').all()){
   await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());
   const source=await img.evaluate(i=>i.currentSrc);
   if(!await img.locator('..').locator('..').evaluate(e=>e.classList.contains('banner')))assert.ok(source.endsWith('-256.webp'));
  }
  for(const button of await page.locator('.city-btn').all())assert.ok((await button.boundingBox()).height>=44);
  await page.locator('[data-city-card="forge"]').focus();await page.locator('[data-city-card="forge"]').press('Enter');
  await page.waitForSelector('.city-window.visible');
  await page.locator('.city-window [data-city-action="upgrade"]').click();
  await page.waitForFunction(()=>window.cityActions.length===1);
  assert.deepEqual(await page.evaluate(()=>window.cityActions[0]),{buildName:'forge',action:'upgrade'});
  await page.locator('.city-window .overlay-close').click();await page.waitForSelector('.city-window',{state:'detached'});
  for(const level of [11,21]){
   await page.evaluate(l=>window.setCityLevel(l),level);
   for(const img of await page.locator('.city-building-image').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
   const sources=await page.locator('.city-building-image').evaluateAll(imgs=>imgs.map(i=>i.currentSrc));
   assert.ok(sources.every(s=>s.includes(level===11?'grand-':'royal-')));
  }
  await page.evaluate(()=>window.setCityLevel(4));await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(700);
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.city-sky').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.deepEqual(errors,[]);if(width===390)await page.screenshot({path:path.join(root,'docs/city-mobile.png'),fullPage:true});
  console.log(JSON.stringify({width,buildings:7,panoramaRequests:1,overflow:false}));await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
