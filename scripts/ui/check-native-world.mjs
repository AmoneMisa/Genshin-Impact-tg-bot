import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {worldState,worldAction,advanceWorld} from '../../functions/game/world/world.js';
import {getHuntState} from '../../miniapp/hunt.js';
import {moveHuntField,advanceHunt} from '../../functions/game/hunt/huntFight.js';
import {findNativePath} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';
import change from '../../functions/game/player/changePlayerGameClass.js';
import update from '../../functions/game/player/updatePlayerStats.js';
import {WORLD_EXTENSION} from '../../template/worldExtension.js';
import compiled from '../../template/nativeRoutes.js';
const firstId=process.env.NATIVE_FIRST_ZONE||'forsaken-plains',secondId=process.env.NATIVE_SECOND_ZONE||'silent-valley';
const first=compiled.routes[firstId],second=compiled.routes[secondId];
assert.ok(first?.available&&second?.available&&first.city===second.city&&firstId!==secondId,'two native routes must share their source town');
const zoneName=id=>WORLD_EXTENSION.find(r=>r.zone.id===id)?.zone.title||id;
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/native-world-ui');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const configurations=[{width:320},{width:390},{width:1100},{width:320,noCanvas:true}];
try{for(const {width,noCanvas=false} of configurations){
 let now=1800000000000,finishNext=false;
 const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:first.city,x:.5,y:.5,path:[],moveAt:now,locks:{}}}};
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);
 const quiet=()=>{const f=s.game.hunt?.field;if(f)for(const m of [f,...Object.values(f.rooms||{})].flatMap(r=>r.mobs||[]))Object.assign(m,{aggressive:false,aggro:false,aggroRange:0,nextAttackAt:now+1e12});};
 const dto=()=>{
  if(finishNext&&s.game.world.walkHome?.native){now=Math.max(now,s.game.world.walkHome.until+1);finishNext=false;}
  advanceWorld(s,now);quiet();return {world:{...worldState(s,now),holdings:[],corpses:[]}};
 };
 const errors=[],calls=[],requests=[],page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 if(noCanvas)await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;requests.push(u);
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/world')return route.fulfill({json:dto()});
  if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/hunt'){quiet();return route.fulfill({json:await getHuntState(s,now)});}
  if(u==='/api/hunt/move'){
   const body=route.request().postDataJSON(),result=moveHuntField(s,body.direction||body.point,now);assert.ok(result.ok);
   now+=30000;quiet();advanceHunt(s,now,()=>.5);quiet();return route.fulfill({json:{...result,hunt:await getHuntState(s,now)}});
  }
  if(u==='/api/world/action'){
   now+=1000;const body=route.request().postDataJSON();calls.push(body);
   if(finishNext&&body.action==='native_stop'&&s.game.world.walkHome?.native){now=s.game.world.walkHome.until+1;finishNext=false;}
   const result=worldAction(s,body,now);quiet();return route.fulfill({status:result.ok?200:409,json:{...result,...dto()}});
  }
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://native.local/fixture');
 await page.evaluate(async()=>{
  await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();
  const statusElement=document.createElement('p');document.body.append(statusElement);
  const api=async(url,opts)=>{const response=await fetch(url,opts),data=await response.json();if(!response.ok){const e=new Error(data.reason);e.payload=data;throw e;}return data;};
  window.fixtureOptions={api,renderState:()=>{},haptic:()=>{},statusElement};
  await(await import('/world-map.js')).openWorldMap(window.fixtureOptions);
 });
 async function selectWalk(name){
  await page.locator('[data-movement]').click();
  await page.getByRole('combobox',{name:'Разделы телепорта',exact:true}).click();
  await page.getByRole('option',{name:'Охота',exact:true}).click();
  await page.locator('[data-quick-go]').filter({hasText:name}).click();
  const walk=page.locator('[data-native-walk]');assert.equal(await walk.isEnabled(),true);
  await walk.focus();assert.equal(await walk.evaluate(n=>n===document.activeElement),true);
  assert.equal(await page.locator('.atlas-popup').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='walk_location'),walk.click()]);
  await page.waitForTimeout(100);
 }
 await selectWalk(zoneName(firstId));assert.equal(s.game.world.mode,'road');assert.ok(s.game.world.walkHome.native);
 assert.equal(await page.locator('[data-mode="city"]').textContent(),'Местность');
 assert.equal(await page.locator('[data-city-view]').isVisible(),false);
 assert.equal(s.game.inventory.gold,1000000);assert.ok(calls.some(c=>c.action==='walk_location'));assert.ok(!calls.some(c=>c.action==='quick_travel'));
 assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.screenshot({path:path.join(out,`native-route-${width}${noCanvas?'-fallback':''}.png`)});
 await page.locator('[data-movement]').click();
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='native_stop'),page.locator('[data-native-stop]').click()]);await page.waitForTimeout(100);
 assert.equal(s.game.world.mode,'native');assert.ok(s.game.world.nativePosition);
 if(!noCanvas){
  const from=s.game.world.nativePosition,box=await page.locator('canvas').boundingBox();
  const candidates=[[0,2200],[2200,0],[-2200,0],[0,-2200],[1800,1800],[-1800,-1800]];
  const goal=candidates.map(([dx,dy])=>({x:from.x+dx,y:from.y+dy,z:from.z})).find(p=>findNativePath(from,p,{allowed:nativeGroundAllowed,maxNodes:2000,reversible:true}).ok);
  assert.ok(goal,'a nearby verified click target exists');
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='native_move'),page.locator('canvas').click({position:{x:box.width/2+(goal.x-from.x)*box.width/14000,y:box.height/2+(goal.y-from.y)*box.width/14000}})]);await page.waitForTimeout(100);
  assert.ok(calls.some(c=>c.action==='native_move'),'background click submits a native walk');
  assert.equal(s.game.world.walkHome.location,null);
  finishNext=true;await page.waitForFunction(()=>document.querySelector('.atlas-status')?.textContent.includes('Выберите место на карте'));
 }
 await selectWalk(zoneName(firstId));assert.equal(s.game.world.walkHome.location,firstId);
 finishNext=true;await page.waitForSelector('.hunt-ground');await page.waitForSelector('.atlas-panel',{state:'detached'});assert.equal(s.game.world.location,firstId);
 assert.equal(await page.locator('.atlas-panel').count(),0,'native arrival opens its hunting room in the same navigation flow');
 quiet();await page.locator('[data-level-travel]').click();const exit=page.locator('dialog[open] [data-native-exit]');assert.equal(await exit.isEnabled(),true);
 await exit.click();await page.waitForSelector('.atlas-panel');await page.waitForSelector('.hunt-overlay',{state:'detached'});assert.equal(await page.locator('.hunt-overlay').count(),0);
 await selectWalk(zoneName(secondId));assert.ok(s.game.world.nativeFields[firstId]);
 await page.locator('[data-movement]').click();finishNext=true;
 // The trip can finish on the server just before a stop request arrives.
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='native_stop'),page.locator('[data-native-stop]').click()]);
 await page.waitForSelector('.hunt-ground');assert.equal(s.game.world.location,secondId);
 assert.equal(await page.locator('.hunt-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.screenshot({path:path.join(out,`native-arrival-${width}${noCanvas?'-fallback':''}.png`)});
 await page.locator('.hunt-overlay [data-dismiss]').first().click();await page.waitForSelector('.hunt-overlay',{state:'detached'});
 assert.equal(await page.locator('[inert],dialog[open]').count(),0);
 assert.equal(requests.some(u=>u.includes('l2j-geodata')||u.endsWith('.gz')),false,'phones never fetch the binary geodata');
 assert.deepEqual(errors,[]);await page.close();console.log(`PASS native ${width}${noCanvas?' no canvas':''}: walk, stop, real cells, zone join, arrival, focus, cleanup`);
}}finally{await browser.close();}
