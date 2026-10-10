import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {getFishingState,performFishingAction} from '../../miniapp/fishing.js';
import {getLuckShopState} from '../../miniapp/luck.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp'),styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
try{for(const width of [320,390,540,1100]){
 const session={game:{stats:{lvl:80},gameClass:{stats:{name:'warrior'},skills:[]},inventory:{gold:32500,luckCoins:0,materials:{},equipment:{items:[]},potions:{items:[]}}}};
 const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const url=new URL(route.request().url());
  if(url.pathname==='/api/fishing'){const body=route.request().postDataJSON();return route.fulfill({json:performFishingAction(session,body.action,body)});}
  if(url.pathname==='/api/luck')return route.fulfill({json:getLuckShopState(session)});
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(async()=>{const {startEmojiIcons}=await import('/icons.js');startEmojiIcons();window.options={api:async(url,options)=>(await fetch(url,{headers:{'Content-Type':'application/json'},...options})).json(),haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span')};const {openFishingGame}=await import('/fishing.js');await openFishingGame(window.options);});
 const check=async(selector)=>{assert.equal(await page.locator(selector).evaluate(n=>n.scrollWidth>n.clientWidth+1),false);await page.locator(`${selector} img`).evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));};
 await check('.fishing-panel');assert.equal(await page.locator('.fishing-panel .mmo-frame').first().evaluate(n=>getComputedStyle(n).display),'block');
 assert.equal(await page.locator('[data-cast]').isDisabled(),true);
 if(width===390)await page.locator('.fishing-panel').screenshot({path:'docs/fishing-390.png'});
 await page.locator('.fishing-rod-catalog summary').click();await check('.fishing-panel');assert.equal(await page.locator('.fishing-rods>article').count(),getFishingState(session).rods.length);
 if(width===390)await page.locator('.fishing-panel').screenshot({path:'docs/fishing-rods-390.png'});
 await page.locator('.fishing-panel .overlay-close').click();await page.locator('.fishing-panel').waitFor({state:'detached'});
 await page.evaluate(async()=>{const {openLuckShopGame}=await import('/luck-shop.js');await openLuckShopGame(window.options);});
 await check('.luck-shop-panel');assert.equal(await page.locator('.luck-categories img').count(),getLuckShopState(session).groups.length);
 if(width===390)await page.locator('.luck-shop-panel').screenshot({path:'docs/luck-shop-390.png'});
 for(const group of getLuckShopState(session).groups){await page.locator(`[data-luck-group="${group.id}"]`).click();await check('.luck-shop-panel');assert.equal(await page.locator('.luck-item').count(),getLuckShopState(session).items.filter(i=>i.group===group.id).length);assert.equal(await page.locator('.luck-item .shop-icon img').count(),await page.locator('.luck-item').count());}
 assert.deepEqual(errors,[]);await page.close();console.log(`Fishing layout, rod catalog and all COL shop categories verified at ${width}px`);
}}finally{await browser.close();}
