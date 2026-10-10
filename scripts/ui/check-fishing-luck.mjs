import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {getFishingState,performFishingAction} from '../../miniapp/fishing.js';
import {getLuckShopState,buyLuckItem} from '../../miniapp/luck.js';
import {castOnce} from '../../functions/game/fishing/fishing.js';
import {getMerchantsState} from '../../miniapp/merchants.js';
import FISHING_DATA from '../../template/fishingData.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp'),styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
try{for(const width of [320,390,540,1100]){
 const session={game:{stats:{lvl:80},gameClass:{stats:{name:'warrior'},skills:[]},inventory:{gold:32500,luckCoins:0,materials:{},equipment:{items:[]},potions:{items:[]}}}};
 session.game.inventory.materials['l2_'+Object.keys(FISHING_DATA.proofs)[0]]=2;
 let castMode='success',castRequests=0;
 const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const url=new URL(route.request().url());
  if(url.pathname==='/api/fishing'){const body=route.request().postDataJSON();if(body.action==='cast'){castRequests++;if(castMode==='error')return route.fulfill({status:409,json:{reason:'not_ready',fishing:getFishingState(session)}});const result=castOnce(session,Date.now(),()=>.5);return route.fulfill({json:{...result,fishing:getFishingState(session)}});}return route.fulfill({json:performFishingAction(session,body.action,body)});}
  if(url.pathname==='/api/merchants')return route.fulfill({json:getMerchantsState(session,route.request().postDataJSON()||{})});
  if(url.pathname==='/api/luck')return route.fulfill({json:getLuckShopState(session)});
  if(url.pathname==='/api/luck/buy'){const r=buyLuckItem(session,route.request().postDataJSON().itemId);return route.fulfill({status:r.ok?200:409,json:{...r,luck:getLuckShopState(session)}});}
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(async()=>{const {startEmojiIcons}=await import('/icons.js');startEmojiIcons();window.options={api:async(url,options)=>{const r=await fetch(url,{headers:{'Content-Type':'application/json'},...options}),data=await r.json();if(!r.ok)throw Object.assign(new Error(data.reason),{payload:data});return data;},haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span')};const {openFishingGame}=await import('/fishing.js');await openFishingGame(window.options);});
 const check=async(selector)=>{assert.equal(await page.locator(selector).evaluate(n=>n.scrollWidth>n.clientWidth+1),false);await page.locator(`${selector} img`).evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));};
 await check('.fishing-panel');assert.equal(await page.locator('.fishing-panel .mmo-frame').first().evaluate(n=>getComputedStyle(n).display),'block');
 assert.equal(await page.locator('[data-cast]').isDisabled(),true);
 const shot=async(selector,file)=>{if(width!==390)return;await page.addStyleTag({content:'.game-overlay{position:static!important;padding:0!important;opacity:1!important}.overlay-backdrop{display:none!important}.overlay-panel{max-height:none!important;overflow:visible!important;transform:none!important;opacity:1!important;margin:auto!important}body{overflow:auto!important}'});await page.locator(selector).screenshot({path:'docs/'+file});};
 await shot('.fishing-panel','fishing-390.png');
 for(const tab of ['bag','guild','rods']){await page.locator(`[data-fishing-tab="${tab}"]`).click();await check('.fishing-panel');assert.equal(await page.locator('.fishing-tabs [aria-pressed=true]').getAttribute('data-fishing-tab'),tab);}
 assert.equal(await page.locator('.fishing-rods>article').count(),getFishingState(session).rods.length);
 await shot('.fishing-panel','fishing-rods-390.png');
 await page.locator('[data-fishing-info]').click();assert.equal(await page.locator('.fishing-info').isVisible(),true);await page.locator('[data-fisher-shop]').click();await page.locator('.merchants-panel').waitFor();assert.equal(await page.locator('[data-tab="fisher"]').getAttribute('class').then(s=>s.includes('active')),true);await page.locator('.merchants-panel .overlay-close').click();await page.locator('.merchants-panel').waitFor({state:'detached'});
 await page.locator('.fishing-panel .overlay-close').click();await page.locator('.fishing-panel').waitFor({state:'detached'});
 session.game.inventory.materials['l2_'+getFishingState(session).rods[0].item]=1;session.game.fishing.learned=true;session.game.fishing.expertise=1;
 for(const mode of ['success','failure','error']){
  castMode=mode;session.game.fishing.lastAt=0;session.game.fishing.fish=mode==='failure'?getFishingState(session).limit:0;
  await page.evaluate(async()=>{const {openFishingGame}=await import('/fishing.js');await openFishingGame(window.options);});
  await page.locator('[data-cast]').click();await page.locator('.fishing-scene[data-phase="casting"]').waitFor();assert.equal(await page.locator('[data-cast]').isDisabled(),true);await page.locator('.fishing-scene[data-phase="waiting"]').waitFor();
  assert.equal(await page.locator('.fishing-animation').getAttribute('src'),'/art/fishing/waiting.webp');
  if(mode!=='error')await page.locator('.fishing-scene[data-phase="pulling"]').waitFor();
  await page.locator(`.fishing-scene[data-phase="${mode==='error'?'idle':mode}"]`).waitFor();await check('.fishing-panel');
  assert.equal(await page.locator('.fishing-animation').getAttribute('src'),`/art/fishing/${mode==='error'?'idle':mode}.webp`);
  if(mode==='error')assert.match(await page.locator('[data-feedback]').textContent(),/не готова/);
  else await shot('.fishing-panel',`fishing-${mode}-390.png`);
  await page.locator('.fishing-panel .overlay-close').click();await page.locator('.fishing-panel').waitFor({state:'detached'});
 }
 assert.equal(castRequests,3);
 if(width===320){session.game.fishing.lastAt=0;castMode='success';await page.evaluate(async()=>{const {openFishingGame}=await import('/fishing.js');await openFishingGame(window.options);});await page.locator('[data-cast]').click();await page.locator('.fishing-panel .overlay-close').click();await page.locator('.fishing-panel').waitFor({state:'detached'});assert.equal(castRequests,4);}
 await page.evaluate(async()=>{const {openLuckShopGame}=await import('/luck-shop.js');await openLuckShopGame(window.options);});
 await check('.luck-shop-panel');assert.equal(await page.locator('[data-luck-group]').count(),getLuckShopState(session).groups.length);
 await shot('.luck-shop-panel','luck-shop-390.png');
 for(const group of getLuckShopState(session).groups){await page.locator(`[data-luck-group="${group.id}"]`).click();await check('.luck-shop-panel');const rows=getLuckShopState(session).items.filter(i=>i.group===group.id);assert.equal(await page.locator('[data-luck-select]').count(),Math.min(24,rows.length));await page.locator('[data-luck-select]').last().click();assert.equal(await page.locator('.luck-selection h3').textContent(),rows[Math.min(24,rows.length)-1].title);assert.equal(await page.locator('.luck-slot img').first().evaluate(n=>n.getBoundingClientRect().width),48);if(rows.length>24){await page.locator('[data-luck-page="1"]').click();await check('.luck-shop-panel');assert.equal(await page.locator('.luck-selection h3').textContent(),rows[24].title);}}
 await page.locator('.luck-shop-panel .overlay-close').click();await page.locator('.luck-shop-panel').waitFor({state:'detached'});session.game.inventory.luckCoins=100;
 await page.evaluate(async()=>{const {openLuckShopGame}=await import('/luck-shop.js');await openLuckShopGame(window.options);});const buy=getLuckShopState(session).items.find(i=>i.group===getLuckShopState(session).groups[0].id);await page.locator('[data-luck-buy]').click();await page.locator('.feedback-result.success').waitFor();assert.equal(session.game.inventory.luckCoins,100-buy.cost);
 if(width===320){await page.locator('.luck-shop-panel .overlay-close').click();await page.locator('.luck-shop-panel').waitFor({state:'detached'});await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(async()=>{const {openFishingGame}=await import('/fishing.js');await openFishingGame(window.options);});await check('.fishing-panel');assert.match(await page.locator('.fishing-animation').evaluate(n=>n.currentSrc),/poster\.webp$/);}
 assert.deepEqual(errors,[]);await page.close();console.log(`Fishing layout, rod catalog and all COL shop categories verified at ${width}px`);
}}finally{await browser.close();}
