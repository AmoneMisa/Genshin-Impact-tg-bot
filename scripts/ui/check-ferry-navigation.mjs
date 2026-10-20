import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {worldState,worldAction,advanceWorld,ensureWorld,cityPoint,CITIES} from '../../functions/game/world/world.js';
import {ferryDock} from '../../functions/game/world/ferryTravel.js';
import {nativeTownHub} from '../../functions/game/world/nativeTownGraph.js';
import change from '../../functions/game/player/changePlayerGameClass.js';
import update from '../../functions/game/player/updatePlayerStats.js';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/ferry-ui');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const reverse of [false,true])for(const {width,noCanvas=false} of [{width:320},{width:390},{width:1100},{width:320,noCanvas:true}]){
 let now=1800000000000;
 const origin=reverse?'rune':'gludin',destination=reverse?'gludin':'rune';
 const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 change(s,'humanFighter');update(s);ensureWorld(s,now);
 const hub=nativeTownHub(origin);Object.assign(s.game.world,{city:origin,z:hub.z},cityPoint(CITIES.find(c=>c.id===origin),hub));
 const dto=()=>({world:{...worldState(s,now),holdings:[],corpses:[]}}),errors=[],calls=[],requests=[];
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,reducedMotion:width===390?'no-preference':'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 if(noCanvas)await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;requests.push(u);
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/world')return route.fulfill({json:dto()});
  if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/world/action'){now+=1000;const body=route.request().postDataJSON();calls.push(body);const result=worldAction(s,body,now);return route.fulfill({status:result.ok?200:409,json:{...result,...dto()}});}
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://ferry.local/fixture');
 await page.evaluate(async()=>{
  await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();
  const api=async(url,opts)=>{const response=await fetch(url,opts),data=await response.json();if(!response.ok){const e=new Error(data.reason);e.payload=data;throw e;}return data;};
  await(await import('/world-map.js')).openWorldMap({api,haptic:()=>{},renderState:()=>{}});
 });
 async function live(predicate){await page.waitForResponse(async r=>r.url().includes('/api/world?live=1')&&predicate((await r.json()).world.player));}
 async function menu(){await page.locator('[data-movement]').click();await page.locator('[data-ferry-menu]').click();const select=page.locator(`[data-ferry-select="${origin}"]`);if(await select.count())await select.click();}
 async function action(name,stop){const button=page.locator(`[data-ferry-action="${name}"]${stop?'[data-stop="'+stop+'"]':''}`);assert.equal(await button.isEnabled(),true);await button.focus();assert.equal(await button.evaluate(n=>n===document.activeElement),true);await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='ferry_'+name),button.click()]);}
 await menu();assert.equal(await page.locator('[data-ferry-action="ticket"]').isDisabled(),true);assert.equal(await page.locator('[data-ferry-action="board"]').isDisabled(),true);
 await action('walk','vendor');now=s.game.world.walkHome.until+1;await live(p=>p.mode==='native');
 await menu();await action('ticket');assert.equal(s.game.inventory.gold,992500);await page.waitForFunction(()=>document.querySelector('[data-ferry-stock]')?.textContent==='1');
 assert.equal(await page.locator('[data-ferry-panel] img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 await page.screenshot({path:path.join(out,`${origin}-vendor-${width}${noCanvas?'-fallback':''}.png`)});
 await action('walk','boarding');now=s.game.world.walkHome.until+1;await live(p=>p.mode==='native');
 now=ferryDock(origin,now).dockAt+1000;await live(p=>p.mode==='native');
 await menu();await action('board');const trip={...s.game.world.walkHome};
 await page.waitForFunction(()=>document.querySelector('.atlas-status')?.textContent.includes('Ожидание отправления'));
 await menu();assert.equal(await page.locator('[data-native-stop]').count(),0);assert.equal(await page.locator('[data-ferry-action="leave"]').isEnabled(),true);
 assert.equal(await page.locator('.atlas-popup').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);await page.keyboard.press('Escape');
 const countBefore=calls.length;if(!noCanvas){await page.locator('canvas').click({position:{x:10,y:10}});assert.equal(calls.length,countBefore);}
 now=trip.departureAt+12000;s.game=JSON.parse(JSON.stringify(s.game));await live(p=>p.transportPhase==='sailing');
 if(!noCanvas)await page.waitForFunction(()=>document.querySelector('.atlas-status')?.textContent==='Морской переход');
 assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.screenshot({path:path.join(out,`${origin}-${width}${noCanvas?'-fallback':''}.png`)});
 now=trip.until;await live(p=>p.mode==='native'&&p.city===destination);
 await page.locator('[data-movement]').click();await page.getByRole('combobox',{name:'Разделы телепорта',exact:true}).click();await page.getByRole('option',{name:'Города',exact:true}).click();
 await page.locator('[data-quick-go]').filter({hasText:CITIES.find(c=>c.id===destination).name}).click();
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='native_walk_city'),page.locator('[data-native-city]').click()]);
 now=s.game.world.walkHome.until+1;await live(p=>p.mode==='city'&&p.city===destination);
 assert.equal(s.game.world.city,destination);assert.equal(s.game.inventory.gold,992500);
 assert.equal(s.game.inventory.materials['l2_'+(origin==='gludin'?7905:7904)],0);
 await page.locator('.atlas-panel [data-dismiss]').first().click();await page.waitForSelector('.atlas-panel',{state:'detached'});
 assert.equal(await page.locator('[inert],dialog[open]').count(),0);
 const count=requests.length;await page.waitForTimeout(2200);assert.equal(requests.length,count);
 assert.equal(requests.some(u=>u.includes('l2j-geodata')||u.endsWith('.gz')),false);assert.deepEqual(errors,[]);
 await page.close();console.log(`PASS ferry ${origin} -> ${destination} ${width}${noCanvas?' noCanvas':''}`);
}}finally{await browser.close();}
