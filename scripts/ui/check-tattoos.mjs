import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {getTattooState} from '../../miniapp/tattoos.js';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import updateStats from '../../functions/game/player/updatePlayerStats.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp');
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
try{for(const width of [320,390,540,1100])for(const className of ['warrior','phoenixKnight']){
 const hero={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:1e9,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(hero,className);updateStats(hero);
 const page=await browser.newPage({viewport:{width,height:950}}),errors=[],queries=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/tattoos'){const query=route.request().postDataJSON();queries.push(query);return route.fulfill({json:{ok:true,tattoos:getTattooState(hero,query)}});}
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(async()=>{
  const {startEmojiIcons}=await import('/icons.js');startEmojiIcons();
  (await import('/overlay-a11y.js')).installOverlayA11y();
  const {openTattoosGame}=await import('/tattoos.js');
  await openTattoosGame({haptic:()=>{},renderState:()=>{},api:async(url,options)=>(await fetch(url,{headers:{'Content-Type':'application/json'},...options})).json()});
 });
 const checkOverflow=async()=>assert.equal(await page.locator('.tattoos-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
 await checkOverflow();
 assert.equal(await page.locator('[data-usable]').evaluate(n=>getComputedStyle(n).appearance),'none');
 await page.locator('[data-owned]').check();await page.waitForFunction(()=>document.querySelector('[data-owned]').checked);
 assert.ok(queries.at(-1).owned);
 await page.locator('[data-owned]').uncheck();await page.locator('[data-usable]').uncheck();
 await page.waitForFunction(()=>document.querySelectorAll('.tattoo-dyes [data-dye]').length>0);
 assert.equal(await page.locator('.tattoos-panel [data-grid-empty]').count(),0,'only real dyes in the grid');assert.equal(await page.locator('.tattoos-panel [data-apply]').count(),0,'applying starts from a chosen dye');
 const icons=await page.locator('.tattoo-dyes [data-dye]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return Math.abs(r.width-r.height);}));
 assert.ok(icons.every(delta=>delta<1),'dye icon frames must be square');
 await checkOverflow();
 await page.locator('[data-stat=CON]').click();await page.waitForFunction(()=>document.querySelector('[data-stat=CON]').classList.contains('active'));
 assert.equal(queries.at(-1).stat,'CON');await checkOverflow();
 await page.locator('.tattoo-dyes [data-dye]').first().click();await page.locator('dialog[open] .tattoo-compare').waitFor();
 assert.ok(await page.locator('dialog[open] .tattoo-compare .character-row').count()>0,'before/after comparison');
 assert.equal(await page.locator('dialog[open]').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,'details fit');
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0,'Escape closes details');
 if(width===390){
  await page.addStyleTag({content:'.tattoos-overlay{position:static!important;height:auto!important;max-height:none!important}.tattoos-panel{position:static!important;height:auto!important;max-height:none!important;overflow:visible!important}.overlay-backdrop{display:none!important}body{overflow:visible!important}'});
  await page.locator('.tattoos-panel img').evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));
  await page.locator('.tattoos-panel').screenshot({path:`docs/tattoos-${className}-390.png`});
 }
 assert.deepEqual(errors,[]);await page.close();console.log(`Symbol Maker layout and styled filters verified: ${className}, ${width}px`);
}}finally{await browser.close();}
