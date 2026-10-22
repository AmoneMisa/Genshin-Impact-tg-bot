import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {worldState,worldAction,advanceWorld} from '../../functions/game/world/world.js';
import {getHuntState} from '../../miniapp/hunt.js';
import {selectHuntTarget,setHuntAttack,useHuntSkill} from '../../functions/game/hunt/huntFight.js';
import {nativeFieldBuckets,nativeActorPoint} from '../../functions/game/world/nativeFieldSpace.js';
import {findNativePath} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';
import change from '../../functions/game/player/changePlayerGameClass.js';
import update from '../../functions/game/player/updatePlayerStats.js';
const {chromium}=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/native-field-pilot-ui');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const cases=[{width:320},{width:390},{width:1100},{width:320,noCanvas:true},{width:320,noImages:true}].filter(c=>!process.env.NATIVE_WIDTH||String(c.width)===process.env.NATIVE_WIDTH);
try{for(const {width,noCanvas=false,noImages=false} of cases){
 let now=1800000000000,finishRoad=false;
 const s={userId:1,userChatData:{user:{id:1,first_name:'Test'}},game:{stats:{lvl:25,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'gludio',x:.5,y:.5,path:[],moveAt:now,locks:{}}}};
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);
 const quiet=()=>{const f=s.game.hunt?.field;if(f)for(const bank of nativeFieldBuckets(f))for(const mob of bank.mobs){mob.aggressive=false;mob.nextAttackAt=now+1e9;}};
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
   quiet();return route.fulfill({status:result.ok?200:409,json:{...result,hunt:await getHuntState(s,now)}});
  }
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  if(noImages&&/\.(webp|jpg|png)$/.test(u))return route.fulfill({status:404});
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
 await page.locator('[data-movement]').click();await page.getByRole('combobox',{name:'Разделы телепорта',exact:true}).click();await page.getByRole('option',{name:'Охота',exact:true}).click();
 await page.locator('[data-quick-go]').filter({hasText:'Земли орков Вуку'}).click();assert.equal(await page.locator('[data-native-walk]').isEnabled(),true);
 await page.locator('[data-native-walk]').click();assert.equal(s.game.world.mode,'road');now+=Math.floor((s.game.world.walkHome.until-now)*.9);
 await page.locator('.atlas-combat:not([hidden])').waitFor();
 assert.ok(s.game.hunt.field.native.journey?.native.remaining>0,'native population streams before the road endpoint');finishRoad=true;
 await page.waitForResponse(async r=>r.url().includes('/api/world?live=1')&&(await r.json()).world.nativeField?.point.x===-12420);
 await page.waitForTimeout(100);
 assert.equal(s.game.world.mode,'location');assert.equal(s.game.world.location,'vuku-lands');assert.equal(s.game.inventory.gold,1e6);
 assert.equal(await page.locator('.hunt-overlay').count(),0);assert.equal(await page.evaluate(()=>window.originalAtlas===document.querySelector('.atlas-panel')&&window.originalCanvas===document.querySelector('canvas')),true);
 assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 const initial=worldState(s,now).nativeField,atPlayer=initial.actors.find(m=>Math.hypot(m.x-initial.point.x,m.y-initial.point.y)<2);assert.ok(atPlayer);
 if(!noCanvas){const box=await page.locator('canvas').boundingBox();await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/hunt/target')),page.locator('canvas').click({position:{x:box.width/2,y:box.height/2}})]);}
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
 await page.locator('.atlas-combat summary').click();assert.equal(await page.locator('.atlas-combat .ui-combat-supply').count(),6);
 assert.equal(await page.locator('.atlas-combat .ui-combat-supply[data-supply="hp"]').isDisabled(),true);await page.locator('.atlas-combat summary').click();
 // Combat and world polling share the same saved actors, even when movement is requested again.
 const before=worldState(s,now).player.worldPoint;
 if(noCanvas){await page.locator('[data-native-step="east"]').click();assert.ok(s.game.hunt.field.native.journey);now+=2000;}
 else {
  const box=await page.locator('canvas').boundingBox(),actors=worldState(s,now).nativeField.actors;
  const goal=[2000,3000,4000,5000].flatMap(n=>[[n,0],[-n,0],[0,n],[0,-n],[n,n],[-n,-n],[n,-n],[-n,n]]).map(([x,y])=>({x:before.x+x,y:before.y+y,z:before.z})).find(p=>{
   const x=box.width/2+(p.x-before.x)*box.width/14000,y=box.height/2+(p.y-before.y)*box.width/14000;
   return x>30&&x<box.width-30&&y>30&&y<box.height-30&&actors.slice(0,8).every(a=>Math.hypot(a.x-p.x,a.y-p.y)*box.width/14000>30)&&findNativePath(before,p,{allowed:nativeGroundAllowed,maxNodes:6000,reversible:true}).ok;
  });
  assert.ok(goal);await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='native_move'),page.locator('canvas').click({position:{x:box.width/2+(goal.x-before.x)*box.width/14000,y:box.height/2+(goal.y-before.y)*box.width/14000}})]);now+=3000;
 }
 await page.waitForTimeout(2100);assert.equal(s.game.hunt.kills,1);assert.equal(await page.locator('.hunt-overlay').count(),0);
 const after=worldState(s,now).player.worldPoint;assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>0);
 assert.equal(await page.locator('.atlas-combat').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.screenshot({path:path.join(out,`native-field-${width}${noCanvas?'-no-canvas':noImages?'-no-images':''}.png`)});
 for(const bank of nativeFieldBuckets(s.game.hunt.field))for(const m of bank.mobs)m.aggro=false;
 await page.locator('[data-movement]').click();await page.getByRole('combobox',{name:'Разделы телепорта',exact:true}).click();await page.getByRole('option',{name:'Города',exact:true}).click();
 await page.getByRole('button',{name:'Глудио',exact:true}).click();await page.locator('[data-native-city]').click();assert.equal(s.game.world.mode,'road');finishRoad=true;
 await page.waitForResponse(async r=>r.url().includes('/api/world?live=1')&&(await r.json()).world.player.mode==='city');
 assert.equal(await page.locator('.atlas-combat').isHidden(),true);assert.equal(s.game.world.mode,'city');assert.ok(s.game.world.nativeFields['vuku-lands']);
 assert.equal(await page.evaluate(()=>window.originalAtlas===document.querySelector('.atlas-panel')),true);
 await page.locator('[data-close]').click();assert.equal(await page.locator('.atlas-panel').count(),0);assert.equal(await page.locator('[inert],dialog[open]').count(),0);
 assert.deepEqual(errors,[]);assert.equal(requests.some(p=>p.endsWith('.gz')||p.includes('l2j-geodata')),false);
 const requestsAtClose=requests.length;await page.waitForTimeout(2200);assert.equal(requests.length,requestsAtClose,'closing stops world and combat requests');
 await page.close();console.log(`PASS native field ${width}${noCanvas?' no Canvas':noImages?' no images':''}: same Atlas/canvas, original actors, combat/reward, walking, city return, focus and cleanup`);
}}finally{await browser.close();}
