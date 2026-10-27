import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {worldAction,worldState,advanceWorld,CITIES,CITY_NPCS,cityPoint} from '../../functions/game/world/world.js';
import {enterHuntField} from '../../functions/game/hunt/huntFight.js';
import {getHuntState} from '../../miniapp/hunt.js';
import {activateNativeField,nativeActorPoint,nativeFieldBuckets} from '../../functions/game/world/nativeFieldSpace.js';
import {nativeSegment} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundFor} from '../../functions/game/world/nativeGround.js';
import access from '../../template/paganAccess.js';
const deep=process.env.PAGAN_KEYS==='1',church=process.env.PAGAN_CHURCH==='1';
import change from '../../functions/game/player/changePlayerGameClass.js';import update from '../../functions/game/player/updatePlayerStats.js';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/native-pagan-ui');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const {width,noCanvas=false,noImages=false} of [{width:320},{width:390},{width:1100},{width:320,noCanvas:true},{width:320,noImages:true}]){
 let now=1800000000000;
 const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{l2_8064:1},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'location',city:'rune',location:'pagan-temple',x:.5,y:.5,path:[],moveAt:now,locks:{}}}};
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);
 assert.ok(enterHuntField(s,'pagan-temple',{now,floor:1}).ok);activateNativeField(s.game.hunt,access.mirrors[32039].to,now);s.game.hunt.field.native.sourceFloor=1;
 const actors=()=>nativeFieldBuckets(s.game.hunt?.field).flatMap(b=>b.mobs||[]),quiet=()=>{for(const m of actors())Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:now+1e9});};
 const dto=()=>{quiet();advanceWorld(s,now);quiet();return {world:{...worldState(s,now),holdings:[],corpses:[]}};};
 function finishWalk(){let ticks=0;while(s.game.hunt?.field?.native?.journey||Number.isInteger(s.game.hunt?.field?.native?.churchPendingStage)){assert.ok(++ticks<1000);now+=1000;quiet();advanceWorld(s,now);quiet();}}
 if(church){const npc=CITY_NPCS.find(n=>n.service==='pagan-church');s.game.hunt=null;Object.assign(s.game.world,{mode:'city',city:'rune',location:null},cityPoint(CITIES.find(c=>c.id==='rune'),npc));const entered=worldAction(s,{action:'pagan_church'},now);assert.ok(entered.ok,JSON.stringify(entered));}
 if(deep){
  // Start at the pinned inside sanctuary NPC; the backend suite separately
  // walks both preceding guarded gates from the original mirror arrival.
  activateNativeField(s.game.hunt,access.npcs[32037].point,now);dto();
  assert.ok(worldAction(s,{action:'native_floor',floor:2},now).ok);finishWalk();
  assert.ok(s.game.hunt.field.native.gatedWalk.closedDoors.includes('19160013'));
  s.game.inventory.materials.l2_8275=0;
 }
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,reducedMotion:'reduce'}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));if(noCanvas)await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
 await page.route('http://pagan.local/**',async route=>{
  const u=new URL(route.request().url()).pathname;requests.push(u);
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/world')return route.fulfill({json:dto()});if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/hunt')return route.fulfill({json:await getHuntState(s,now)});if(u==='/api/combat/chat')return route.fulfill({json:{ok:true,messages:[]}});
  if(u==='/api/world/action'){
   now+=100;const body=route.request().postDataJSON(),result=worldAction(s,body,now);assert.ok(result.ok,JSON.stringify({body,result}));
   if(s.game.hunt?.field?.native?.journey){
    const trip=s.game.hunt.field.native.journey;let previous=trip.native.point;
    for(const p of trip.native.path){assert.ok(nativeSegment(previous,p,{allowed:nativeGroundFor(s,now),reversible:true}));previous=p;}
    s.game=JSON.parse(JSON.stringify(s.game));finishWalk();
   }
   if(body.action==='native_door_key'){s.game=JSON.parse(JSON.stringify(s.game));now+=500;advanceWorld(s,now);quiet();}
   return route.fulfill({json:{...result,...dto(),hunt:await getHuntState(s,now)}});
  }
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  if(noImages&&(/\.(webp|png|jpg)$/.test(u)||u.startsWith('/art/world/native/')))return route.fulfill({status:404});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://pagan.local/fixture');await page.evaluate(async()=>{await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();const api=async(u,o)=>{const r=await fetch(u,o);return r.json();};await(await import('/world-map.js')).openWorldMap({api,statusElement:document.createElement('p')});window.firstAtlas=document.querySelector('.atlas-panel');window.firstCanvas=document.querySelector('canvas');});
 await page.locator('.atlas-combat:not([hidden])').waitFor();await page.locator('[data-native-levels]>summary').click();
 if(church){
  assert.equal(worldState(s,now).nativeField.ground.asset,'/art/world/native/pagan-temple-floor-3.svg');
  const drop=page.locator('[data-native-floor="4"]:not([data-native-route])');assert.ok(await drop.isEnabled());
  await drop.focus();assert.ok(await drop.evaluate(n=>n===document.activeElement));
  await page.screenshot({path:path.join(out,`church-${width}${noCanvas?'-no-canvas':noImages?'-no-images':''}.png`)});
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='native_floor'),drop.click()]);
  assert.equal(s.game.hunt.field.native.sourceFloor,4);assert.ok(s.game.world.lastFall);assert.ok(s.game.gameClass.stats.hp>=1);
  assert.equal(worldState(s,now).nativeField.ground.asset,'/art/world/native/pagan-temple-floor-4.svg');
  const mirror=page.locator('[data-native-route="32039:SCRIPT:0"]');await mirror.waitFor();assert.ok(await mirror.isEnabled());
  await page.screenshot({path:path.join(out,`descent-${width}${noCanvas?'-no-canvas':noImages?'-no-images':''}.png`)});
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.routeId==='32039:SCRIPT:0'),mirror.click()]);
  assert.equal(s.game.hunt.field.native.sourceFloor,1);assert.equal(s.game.inventory.gold,1e6);
 }else if(deep){
  const key=page.locator('[data-door-id="19160013"][data-door-key="8275"]');assert.ok(await key.isDisabled());
  s.game.inventory.materials.l2_8275=2;await page.waitForFunction(()=>!document.querySelector('[data-door-id="19160013"][data-door-key="8275"]')?.disabled);
  if(await key.getAttribute('data-door-approach')==='true'){
   await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='native_door_guide'),key.click()]);
   await page.waitForFunction(()=>document.querySelector('[data-door-id="19160013"][data-door-key="8275"]')?.dataset.doorApproach==='false');
  }
  await key.focus();assert.ok(await key.evaluate(n=>n===document.activeElement));const before=nativeActorPoint(s.game.hunt.field);
  assert.equal(await key.locator('img').getAttribute('src'),'/art/l2-extra/icon-etc_old_key_i02-32.webp');
  await page.screenshot({path:path.join(out,`key-${width}${noCanvas?'-no-canvas':noImages?'-no-images':''}.png`)});
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='native_door_key'),key.click()]);
  assert.deepEqual(nativeActorPoint(s.game.hunt.field),before);assert.equal(s.game.inventory.materials.l2_8275,1);assert.ok(worldState(s,now).nativeField.doors.find(d=>d.id==='19160013').open);
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='native_floor'),page.locator('[data-native-floor="2"]:not([data-native-route])').click()]);
  assert.equal(s.game.hunt.field.native.sourceFloor,2);assert.equal(s.game.inventory.gold,1e6);
 }else{
 const gate=page.locator('[data-native-route="32034:SCRIPT:0"]');assert.equal(await gate.count(),0,'door actions appear beside the source NPC');
 await page.locator('button[data-native-guide="32034"]').click();await page.waitForFunction(()=>!document.querySelector('[data-native-route="32034:SCRIPT:0"]')?.disabled);
 await gate.focus();assert.ok(await gate.evaluate(n=>n===document.activeElement));const before=nativeActorPoint(s.game.hunt.field);
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.routeId==='32034:SCRIPT:0'),gate.click()]);
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),before);assert.equal(s.game.inventory.materials.l2_8064,1);assert.equal(s.game.inventory.gold,1e6);
 assert.ok(worldState(s,now).nativeField.doors.find(d=>d.id==='19160001').open);
 const image=worldState(s,now).nativeField.ground;assert.equal(image.asset,'/art/world/native/pagan-temple.svg');
 await page.screenshot({path:path.join(out,`inside-${width}${noCanvas?'-no-canvas':noImages?'-no-images':''}.png`)});
 await page.locator('button[data-native-guide="32040"]').click();await page.waitForFunction(()=>!document.querySelector('[data-native-route="32040:SCRIPT:0"]')?.disabled);
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.routeId==='32040:SCRIPT:0'),page.locator('[data-native-route="32040:SCRIPT:0"]').click()]);
 assert.equal(s.game.world.mode,'location');assert.equal(s.game.hunt.field.native.sourceFloor,3);assert.deepEqual(nativeActorPoint(s.game.hunt.field),access.mirrors[32040].to);
 }
 assert.ok(await page.evaluate(()=>window.firstAtlas===document.querySelector('.atlas-panel')&&window.firstCanvas===document.querySelector('canvas')));
 assert.ok(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1));assert.deepEqual(errors,[]);
 assert.equal(requests.some(u=>u.includes('/vendor/phaser/')||u.includes('l2j-geodata')||u.endsWith('.gz')),false);
 await page.locator('.atlas-panel>[data-close],.atlas-panel>.game-dialog-heading [data-close]').first().click();const count=requests.length;await page.waitForTimeout(2300);assert.equal(requests.length,count);assert.equal(await page.locator('.atlas-overlay,dialog[open],[inert]').count(),0);await page.close();
 console.log(`PASS Pagan ${church?'church/descent ':deep?'key/ritual floor ':''}${width}${noCanvas?' no Canvas':noImages?' no images':''}: source movement, same Atlas, original items/doors, focus and cleanup`);
}}finally{await browser.close();}
