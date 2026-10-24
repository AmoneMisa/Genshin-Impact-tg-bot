import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {worldState,worldAction,advanceWorld} from '../../functions/game/world/world.js';
import {getHuntState} from '../../miniapp/hunt.js';
import {selectHuntTarget,setHuntAttack,useHuntSkill} from '../../functions/game/hunt/huntFight.js';
import {weaponSpatial} from '../../functions/game/hunt/huntSpatial.js';
import {nativeFieldBuckets,nativeActorPoint,nativeFieldZone} from '../../functions/game/world/nativeFieldSpace.js';
import {findNativePath,nativeSegment} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';
import change from '../../functions/game/player/changePlayerGameClass.js';
import update from '../../functions/game/player/updatePlayerStats.js';
import {nativeRoute} from '../../functions/game/world/nativeTravel.js';
import islands from '../../template/nativeIslandRoutes.js';
import shores from '../../template/nativePortRoutes.js';
import {ferryDock} from '../../functions/game/world/ferryTravel.js';
import pilot from '../../template/nativeFieldPilot.js';
import {LOCATIONS,CITIES} from '../../template/worldMap.js';
import {LOCATION_LEVELS} from '../../template/locationLevels.js';
import {WORLD_EXTENSION} from '../../template/worldExtension.js';
const zone=process.env.NATIVE_PILOT_ZONE||'vuku-lands',city=pilot.fields[zone].city;
const fieldRoute=nativeRoute(zone),island=pilot.fields[zone].island;
const zoneName=WORLD_EXTENSION.find(r=>r.zone.id===zone)?.zone.title||LOCATIONS.find(l=>l.id===zone)?.name||zone,cityName=CITIES.find(c=>c.id===city).name,endpoint=island?shores.routes[fieldRoute.isolatedPort].to:fieldRoute.to;
const {chromium}=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/native-field-pilot-ui',zone);fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const cases=[{width:320},{width:390},{width:1100},{width:320,noCanvas:true},{width:320,noImages:true}].filter(c=>!process.env.NATIVE_WIDTH||String(c.width)===process.env.NATIVE_WIDTH);
try{for(const {width,noCanvas=false,noImages=false} of cases){
 let now=1800000000000,finishRoad=false;
 const s={userId:1,userChatData:{user:{id:1,first_name:'Test'}},game:{stats:{lvl:Math.min(85,Math.max(...LOCATION_LEVELS[zone].mobs.map(m=>m.level))+4),currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city,x:.5,y:.5,path:[],moveAt:now,locks:{}}}};
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);
 const quiet=()=>{const f=s.game.hunt?.field;if(f)for(const bank of nativeFieldBuckets(f))for(const mob of bank.mobs){mob.aggressive=false;mob.aggro=false;mob.nextAttackAt=now+1e9;}};
 if(island){
  const port='rune-primeval';
  const walk=stop=>{assert.equal(worldAction(s,{action:'ferry_walk',port,stop},now).ok,true);now=s.game.world.walkHome.until+1;advanceWorld(s,now);quiet();};
  walk('vendor');assert.equal(worldAction(s,{action:'ferry_ticket',port},now).ok,true);walk('boarding');
  now=ferryDock(port,now).dockAt+1000;assert.equal(worldAction(s,{action:'ferry_board',port},now).ok,true);now=s.game.world.walkHome.until;advanceWorld(s,now);quiet();
 }
 if(process.env.NATIVE_OUTSIDE_TELEPORT){
  assert.ok(fieldRoute.interiorApproach);assert.equal(worldAction(s,{action:'quick_travel',location:zone},now).ok,true);
  assert.deepEqual(nativeActorPoint(s.game.hunt.field),fieldRoute.entry);assert.equal(worldState(s,now).nativeField.actors.length,0);
 }
 const startingGold=s.game.inventory.gold;
 const dto=()=>{const trip=s.game.world.walkHome||s.game.hunt?.field?.native?.journey;if(finishRoad&&trip?.native){now=trip.until+1;finishRoad=false;}advanceWorld(s,now);quiet();return {world:{...worldState(s,now),holdings:[],corpses:[]}};};
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,reducedMotion:'reduce'}),errors=[],requests=[],calls=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(noCanvas)await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;requests.push(u);
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/world')return route.fulfill({json:dto()});
  if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/hunt'){quiet();return route.fulfill({json:await getHuntState(s,now)});}
  if(u==='/api/world/action'){
   now+=100;const body=route.request().postDataJSON();calls.push(body);
   const result=worldAction(s,body,now);quiet();return route.fulfill({status:result.ok?200:409,json:{...result,...dto(),hunt:await getHuntState(s,now)}});
  }
  if(u.startsWith('/api/hunt/')){
   now+=100;const body=route.request().postDataJSON();calls.push({action:u,...body});
   const result=u.endsWith('/target')?selectHuntTarget(s,body.targetId,now):u.endsWith('/attack')?setHuntAttack(s,body.enabled,now):useHuntSkill(s,body.skillIndex,{now,random:()=>.99});
   if(u.endsWith('/attack')&&body.enabled){for(let i=0;i<60&&!s.game.hunt.kills;i++){now+=2000;quiet();await getHuntState(s,now);}assert.ok(s.game.hunt.kills,JSON.stringify({point:nativeActorPoint(s.game.hunt.field),target:s.game.hunt.field.target,order:s.game.hunt.field.autoAttack,log:s.game.hunt.log.slice(-3),journey:s.game.hunt.field.native.journey?.native}));}
   quiet();return route.fulfill({status:result.ok?200:409,json:{...result,hunt:await getHuntState(s,now)}});
  }
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  if(noImages&&(/\.(webp|jpg|png)$/.test(u)||u.startsWith('/art/world/native/')))return route.fulfill({status:404});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://pilot.local/fixture');
 await page.evaluate(async()=>{
  await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();
  const statusElement=document.createElement('p');document.body.append(statusElement);
  const api=async(url,opts)=>{const response=await fetch(url,opts),data=await response.json();if(!response.ok){const e=new Error(data.reason);e.payload=data;throw e;}return data;};
  await(await import('/world-map.js')).openWorldMap({api,statusElement});window.originalAtlas=document.querySelector('.atlas-panel');window.originalCanvas=document.querySelector('canvas');
 });
 if(!island){
 await page.locator('[data-movement]').click();await page.getByRole('combobox',{name:'Разделы телепорта',exact:true}).click();await page.getByRole('option',{name:'Охота',exact:true}).click();
 await page.locator('[data-quick-go]').filter({hasText:zoneName}).click();assert.equal(await page.locator('[data-native-walk]').isEnabled(),true);
 await page.locator('[data-native-walk]').click();assert.equal(s.game.world.mode,process.env.NATIVE_OUTSIDE_TELEPORT?'location':'road');
 if(pilot.fields[zone].interior){
  const trip=s.game.world.walkHome||s.game.hunt?.field?.native?.journey;let previous=trip.native.point,distance=0,entryAt=null;
  for(const p of trip.native.path){
   const cells=nativeSegment(previous,p,{allowed:nativeGroundAllowed,reversible:true});assert.ok(cells);
   for(let i=0;i<cells.length;i+=16){const cell=cells[i];if(nativeFieldZone(cell,zone)){entryAt=now+Math.ceil((distance+Math.hypot(cell.x-previous.x,cell.y-previous.y))/trip.native.remaining*(trip.until-now))+100;break;}}
   if(entryAt)break;distance+=Math.hypot(p.x-previous.x,p.y-previous.y);previous=p;
  }
  assert.ok(entryAt&&entryAt<trip.until,'source-visible cave approach before arrival');now=entryAt;
 }else now+=Math.floor((s.game.world.walkHome.until-now)*.9);
 await page.locator('.atlas-combat:not([hidden])').waitFor();
 assert.ok(s.game.hunt.field.native.journey?.native.remaining>0,'native population streams before the road endpoint');
 if(process.env.NATIVE_RESUME){
  await page.locator('[data-movement]').click();await page.locator('[data-native-stop]').click();
  const stopped=worldState(s,now).nativeField.point;assert.equal(s.game.hunt.field.native.journey,undefined);
  await page.locator('[data-movement]').click();await page.getByRole('combobox',{name:'Разделы телепорта',exact:true}).click();await page.getByRole('option',{name:'Охота',exact:true}).click();
  await page.locator('[data-quick-go]').filter({hasText:zoneName}).click();assert.equal(await page.locator('[data-native-walk]').isEnabled(),true);
  await page.locator('[data-native-walk]').click();assert.equal(s.game.world.mode,'location');assert.ok(s.game.hunt.field.native.journey);
  assert.deepEqual(worldState(s,now).nativeField.point,stopped);assert.equal(await page.locator('.hunt-overlay').count(),0);
 }
 finishRoad=true;
 await page.waitForResponse(async r=>r.url().includes('/api/world?live=1')&&(await r.json()).world.nativeField?.point.x===endpoint.x);
 }else await page.locator('.atlas-combat:not([hidden])').waitFor();
 await page.waitForTimeout(100);
 assert.equal(s.game.world.mode,'location');assert.equal(s.game.world.location,zone);assert.equal(s.game.inventory.gold,startingGold);
 assert.equal(await page.locator('.hunt-overlay').count(),0);assert.equal(await page.evaluate(()=>window.originalAtlas===document.querySelector('.atlas-panel')&&window.originalCanvas===document.querySelector('canvas')),true);
 assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 const initial=worldState(s,now).nativeField,atPlayer=[...initial.actors].sort((a,b)=>Math.hypot(a.x-initial.point.x,a.y-initial.point.y)-Math.hypot(b.x-initial.point.x,b.y-initial.point.y)).find(m=>{const share=Math.min(1,weaponSpatial(s,now).range*.85/Math.max(1,Math.hypot(m.x-initial.point.x,m.y-initial.point.y)));return findNativePath(initial.point,{x:m.x+(initial.point.x-m.x)*share,y:m.y+(initial.point.y-m.y)*share,z:m.z},{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true,heuristicWeight:2}).ok;});assert.ok(atPlayer);
 if(!noCanvas&&zone==='vuku-lands'){const box=await page.locator('canvas').boundingBox();await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/hunt/target')),page.locator('canvas').click({position:{x:box.width/2,y:box.height/2}})]);}
 else {const index=await page.locator('[data-native-target]').evaluate((n,id)=>[...n.options].findIndex(o=>o.value===id),atPlayer.instanceId);assert.ok(index>=0);await page.getByRole('combobox',{name:'Цель рядом',exact:true}).click();await page.getByRole('option').nth(index).click();await page.waitForTimeout(100);}
 assert.ok(calls.some(c=>c.action==='/api/hunt/target'));
 const victim=nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs).find(m=>m.instanceId===s.game.hunt.field.target);victim.currentHp=1;
 await page.locator('.atlas-combat [data-attack]').focus();assert.equal(await page.locator('.atlas-combat [data-attack]').evaluate(n=>n===document.activeElement),true);
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/hunt/attack')),page.locator('.atlas-combat [data-attack]').click()]);
 await page.locator('.atlas-combat [data-last-loot]:not([hidden])').waitFor();
 assert.equal(s.game.hunt.kills,1);assert.ok(victim.rewarded);quiet();
 await page.locator('.atlas-combat [data-last-loot]').click();await page.locator('.loot-notice-panel').waitFor();
 assert.ok((await page.locator('.loot-notice-panel').innerText()).includes('SP'));
 assert.equal(await page.locator('.loot-notice-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.locator('.loot-notice-overlay [data-dismiss]').click();await page.waitForSelector('.loot-notice-overlay',{state:'detached'});
 await page.locator('.atlas-combat details:has([data-native-supplies])>summary').click();assert.equal(await page.locator('.atlas-combat .ui-combat-supply').count(),6);
 assert.equal(await page.locator('.atlas-combat .ui-combat-supply[data-supply="hp"]').isDisabled(),true);await page.locator('.atlas-combat details:has([data-native-supplies])>summary').click();
 if(pilot.fields[zone].floors){
  const targetFloor=Number(process.env.NATIVE_FLOOR||2);
  const {default:levels}=await import('../../template/nativeLevelRoutes.js'),model=levels.zones[zone],beforeFloor=worldState(s,now).nativeField.point;
  const kept=nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs).find(m=>m.sourceFloor!==1&&m.currentHp>0);assert.ok(kept);kept.currentHp=Math.floor(kept.hp/2);const remembered={id:kept.instanceId,hp:kept.currentHp};
  await page.locator('[data-native-levels]>summary').click();
  const down=page.locator(`[data-native-floor="${targetFloor}"]`);assert.equal(await down.isEnabled(),true);await down.focus();assert.equal(await down.evaluate(n=>n===document.activeElement),true);
  await down.click();assert.deepEqual(worldState(s,now).nativeField.point,beforeFloor);assert.ok(s.game.hunt.field.native.journey?.native.remaining>0);
  s.game=JSON.parse(JSON.stringify(s.game));finishRoad=true;
  await page.waitForResponse(async r=>{if(!r.url().includes('/api/world?live=1'))return false;const p=(await r.json()).world.nativeField?.point;return p&&['x','y','z'].every(k=>p[k]===model.levels[targetFloor].to[k]);});
  await page.waitForFunction(n=>document.querySelector(`[data-native-floor="${n}"]`)?.disabled,targetFloor);
  assert.equal(s.game.hunt.field.native.sourceFloor,targetFloor);assert.equal(nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs).find(m=>m.instanceId===remembered.id)?.currentHp,remembered.hp);
  await page.screenshot({path:path.join(out,`native-levels-${width}${noCanvas?'-no-canvas':noImages?'-no-images':''}.png`)});
  await page.locator('[data-native-floor="1"]').click();finishRoad=true;
  await page.waitForResponse(async r=>{if(!r.url().includes('/api/world?live=1'))return false;const p=(await r.json()).world.nativeField?.point;return p&&['x','y','z'].every(k=>p[k]===model.root[k]);});
  await page.waitForFunction(()=>document.querySelector('[data-native-floor="1"]')?.disabled);
  assert.equal(s.game.hunt.field.native.sourceFloor,1);await page.locator('[data-native-levels]>summary').click();
  assert.equal(await page.locator('.hunt-overlay').count(),0);assert.equal(await page.locator('[data-native-levels]').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 }
 // Combat and world polling share the same saved actors, even when movement is requested again.
 const before=worldState(s,now).player.worldPoint;
 if(noCanvas){
  const direction=[['east',200,0],['west',-200,0],['south',0,200],['north',0,-200]].find(([,x,y])=>findNativePath(before,{x:before.x+x,y:before.y+y,z:before.z},{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true}).ok);assert.ok(direction);
  await page.locator(`[data-native-step="${direction[0]}"]`).click();assert.ok(s.game.hunt.field.native.journey);now+=2000;
 }
 else {
  const box=await page.locator('canvas').boundingBox(),actors=worldState(s,now).nativeField.actors;
  const trail=[...(s.game.hunt.field.native.nativeTrail?.points||[]).slice().reverse(),...fieldRoute.path.slice(-12).reverse()],trace=trail.flatMap(p=>{const distance=Math.hypot(p.x-before.x,p.y-before.y);return [600,1000,1500,2000,3000,4000,5000].filter(n=>n<=distance).map(n=>({x:before.x+(p.x-before.x)*n/distance,y:before.y+(p.y-before.y)*n/distance,z:before.z}));});
  const candidates=[...trace,...[600,1000,1500,2000,3000,4000,5000].flatMap(n=>[[n,0],[-n,0],[0,n],[0,-n],[n,n],[-n,-n],[n,-n],[-n,n]]).map(([x,y])=>({x:before.x+x,y:before.y+y,z:before.z}))].map(p=>({...p,z:before.z})).filter(p=>{
   const x=box.width/2+(p.x-before.x)*box.width/14000,y=box.height/2+(p.y-before.y)*box.width/14000;
   return x>30&&x<box.width-30&&y>30&&y<box.height-30&&actors.slice(0,box.width<700?8:16).every(a=>Math.hypot(a.x-p.x,a.y-p.y)*box.width/14000>30);
  });
  let goal;for(const candidate of candidates){
   const visible=await page.locator('canvas').evaluate((n,p)=>document.elementFromPoint(p.x,p.y)===n,{x:box.x+box.width/2+(candidate.x-before.x)*box.width/14000,y:box.y+box.height/2+(candidate.y-before.y)*box.width/14000});
   if(visible&&findNativePath(before,candidate,{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true,heuristicWeight:2}).ok){goal=candidate;break;}
  }
  assert.ok(goal);const [moveResponse]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='native_move'),page.locator('canvas').click({position:{x:box.width/2+(goal.x-before.x)*box.width/14000,y:box.height/2+(goal.y-before.y)*box.width/14000}})]);const movePayload=await moveResponse.json();assert.equal(moveResponse.status(),200,JSON.stringify({reason:movePayload.reason,visited:movePayload.visited,goal,requested:moveResponse.request().postDataJSON().point,from:before}));now+=3000;
 }
 await page.waitForTimeout(2100);assert.equal(s.game.hunt.kills,1);assert.equal(await page.locator('.hunt-overlay').count(),0);
 const after=worldState(s,now).player.worldPoint;assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>0);
 assert.equal(await page.locator('.atlas-combat').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 const ground=worldState(s,now).nativeField?.ground;
 if(pilot.fields[zone].interior){assert.ok(ground?.asset);if(!noCanvas)assert.ok(requests.includes(ground.asset),'cave footprint requested at the underground point');}
 await page.screenshot({path:path.join(out,`native-field-${width}${noCanvas?'-no-canvas':noImages?'-no-images':''}.png`)});
 for(const bank of nativeFieldBuckets(s.game.hunt.field))for(const m of bank.mobs)m.aggro=false;
 await page.waitForResponse(async r=>r.url().includes('/api/world?live=1')&&(await r.json()).world.quickTravel.blocked===null);await page.waitForTimeout(100);
 if(!island){
 await page.locator('[data-movement]').click();await page.getByRole('combobox',{name:'Разделы телепорта',exact:true}).click();await page.getByRole('option',{name:'Города',exact:true}).click();
 await page.getByRole('button',{name:cityName,exact:true}).click();assert.equal(await page.locator('[data-native-city]').isEnabled(),true,JSON.stringify({mode:s.game.world.mode,zone:s.game.world.location,blocked:worldState(s,now).quickTravel.blocked,cities:worldState(s,now).nativeWalkCities}));await page.locator('[data-native-city]').click();assert.equal(s.game.world.mode,'road');finishRoad=true;
 await page.waitForResponse(async r=>r.url().includes('/api/world?live=1')&&(await r.json()).world.player.mode==='city');
 assert.equal(await page.locator('.atlas-combat').isHidden(),true);assert.equal(s.game.world.mode,'city');assert.ok(s.game.world.nativeFields[zone]);
 }else{
  const returnGold=s.game.inventory.gold;
  await page.locator('[data-movement]').click();await page.locator('[data-ferry-menu]').click();
  const select=page.locator(`[data-ferry-select="${fieldRoute.isolatedPort}"]`);if(await select.count())await select.click();
  const button=page.locator('[data-ferry-action="walk"][data-stop="vendor"]');assert.equal(await button.isEnabled(),true);await button.click();finishRoad=true;
  const vendor=shores.routes[fieldRoute.isolatedPort].vendor;
  await page.waitForResponse(async r=>{if(!r.url().includes('/api/world?live=1'))return false;const dto=(await r.json()).world;return ['x','y','z'].every(k=>dto.player.worldPoint?.[k]===vendor[k]);});
  assert.deepEqual(worldState(s,now).nativeWalkCities,[]);assert.equal(s.game.world.nativeIsland,island);assert.equal(s.game.hunt.kills,1);assert.equal(s.game.inventory.gold,returnGold);
 }
 assert.equal(await page.evaluate(()=>window.originalAtlas===document.querySelector('.atlas-panel')),true);
 await page.locator('[data-close]').click();assert.equal(await page.locator('.atlas-panel').count(),0);assert.equal(await page.locator('[inert],dialog[open]').count(),0);
 assert.deepEqual(errors,[]);assert.equal(requests.some(p=>p.endsWith('.gz')||p.includes('l2j-geodata')),false);
 const requestsAtClose=requests.length;await page.waitForTimeout(2200);assert.equal(requests.length,requestsAtClose,'closing stops world and combat requests');
 await page.close();console.log(`PASS native field ${zone} ${width}${noCanvas?' no Canvas':noImages?' no images':''}: same Atlas/canvas, original actors, combat/reward, walking, ${island?'port':'city'} return, focus and cleanup`);
}}finally{await browser.close();}
