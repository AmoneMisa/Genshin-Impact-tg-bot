import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';import {worldAction,worldState,advanceWorld} from '../../functions/game/world/world.js';
import {getHuntState} from '../../miniapp/hunt.js';import {nativeFieldBuckets} from '../../functions/game/world/nativeFieldSpace.js';
import change from '../../functions/game/player/changePlayerGameClass.js';import update from '../../functions/game/player/updatePlayerStats.js';
import {findNativePath} from '../../functions/game/world/nativeNavigation.js';import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';import source from '../../template/hellboundAccess.js';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/hellbound-access-ui');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),file=>fs.readFileSync(path.join(root,file.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const cases=[{width:320},{width:390},{width:1100},{width:320,noCanvas:true},{width:320,noImages:true}].filter(c=>!process.env.HELLBOUND_WIDTH||c.width===Number(process.env.HELLBOUND_WIDTH));
try{for(const {width,noCanvas=false,noImages=false}of cases){
 let now=1800000000000;const s={userId:1,userChatData:{user:{id:1,first_name:'Test'}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{scroll_escape:2},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'gludin',x:.5,y:.5,path:[],moveAt:now,locks:{}}}};
 const chat={game:{hellbound:{level:1}},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);
 const quiet=()=>{for(const mob of nativeFieldBuckets(s.game.hunt?.field).flatMap(b=>b.mobs||[]))Object.assign(mob,{aggressive:false,aggro:false,nextAttackAt:now+1e9});};
 const dto=()=>{advanceWorld(s,now);quiet();return {world:{...worldState(s,now),holdings:[],corpses:[]}};};
 const page=await browser.newPage({viewport:{width,height:820},hasTouch:width<500,reducedMotion:'reduce'}),requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(noCanvas)await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;requests.push(u);
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/world')return route.fulfill({json:dto()});if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/hunt')return route.fulfill({json:await getHuntState(s,now)});if(u==='/api/combat/chat')return route.fulfill({json:{ok:true,messages:[]}});
  if(u==='/api/world/action'){
   const body=route.request().postDataJSON();now+=100;const result=worldAction(s,body,now);assert.ok(result.ok,JSON.stringify({body,result}));
   const trip=s.game.world.walkHome||s.game.hunt?.field?.native?.journey;if(trip?.native)now=trip.until+1;else if(body.action==='approach_npc')now+=60000;
   advanceWorld(s,now);quiet();return route.fulfill({json:{...result,...dto(),hunt:await getHuntState(s,now)}});
  }
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  if(noImages&&/\.(webp|png|jpg)$/.test(u))return route.fulfill({status:404});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://hellbound.local/fixture');await page.evaluate(async()=>{await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();const api=async(u,o)=>{const r=await fetch(u,o),v=await r.json();if(!r.ok)throw Object.assign(new Error(v.reason),{payload:v});return v;};await(await import('/world-map.js')).openWorldMap({api,statusElement:document.createElement('p')});window.firstAtlas=document.querySelector('.atlas-panel');window.firstCanvas=document.querySelector('.atlas-stage canvas');});
 const same=async()=>assert.ok(await page.evaluate(()=>window.firstAtlas===document.querySelector('.atlas-panel')&&window.firstCanvas===document.querySelector('.atlas-stage canvas')));
 async function closePopup(){const b=page.locator('.atlas-popup:not([hidden]) [data-dismiss]');if(await b.count())await b.first().click();}
 async function openNpc(id){
  await closePopup();await page.locator('[data-movement]').click();const q=s.game.worldQuests?.[130],target=!q?.completedAt&&(q?.condition===2?'casian':[1,3].includes(q?.condition)?'galate':null);
  if(id===target){
   await page.getByRole('combobox',{name:'Разделы телепорта',exact:true}).click();await page.getByRole('option',{name:'Цели квестов',exact:true}).click();
   await page.locator('[data-quick-go]').filter({hasText:id==='casian'?'Casian':'Galate'}).click();assert.equal(await page.locator('[data-quick-confirm]').count(),0);
   assert.equal(await page.locator('.atlas-popup').evaluate(p=>p.scrollWidth<=p.clientWidth+1),true);
   assert.equal(await page.locator('#atlas-popup-title').evaluate(h=>h.getBoundingClientRect().height<=parseFloat(getComputedStyle(h).lineHeight)+1),true,'movement title must fit without breaking a word');
   const heading=await page.locator('#atlas-popup-title').evaluate(h=>({top:h.getBoundingClientRect().top,panel:h.closest('.atlas-popup').getBoundingClientRect().top,scroll:h.closest('.atlas-popup').scrollTop,atlas:h.closest('.atlas-panel').scrollTop,body:document.scrollingElement.scrollTop}));assert.ok(heading.top>=Math.max(8,heading.panel+8),JSON.stringify(heading));
   if(id==='galate'&&q.condition===1)await page.screenshot({path:path.join(out,`target-${width}${noCanvas?'-no-canvas':noImages?'-no-images':''}.png`)});
   await page.locator(`[data-quest-npc="hellbound:${id}"]`).click();return;
  }
  const details=page.locator('.atlas-popup details').filter({has:page.locator(`[data-hellbound-show="hellbound:${id}"]`)});await details.locator('summary').click();await page.locator(`[data-hellbound-show="hellbound:${id}"]`).click();
 }
 async function action(id,event){await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')),page.locator(`[data-hellbound-action="${event}"][data-hellbound-npc="hellbound:${id}"]`).click()]);await page.waitForTimeout(50);await same();}
 async function city(name){await closePopup();await page.locator('[data-movement]').click();await page.getByRole('combobox',{name:'Разделы телепорта',exact:true}).click();await page.getByRole('option',{name:'Города',exact:true}).click();await page.locator('[data-quick-go]').filter({hasText:name}).click();await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')),page.locator('[data-quick-confirm]').click()]);await page.waitForTimeout(50);await same();}
 async function casian(){await openNpc('casian');await page.locator('.atlas-popup details>summary').click();if(await page.locator('[data-hellbound-action="keeper"]').count()){await action('casian','keeper');await openNpc('casian');await page.locator('.atlas-popup details>summary').click();}await action('casian','route');await openNpc('casian');await action('casian','walk');await openNpc('casian');assert.equal((await page.locator('[data-hellbound-action="walk"]').count()),0);}
 async function galate(){await city('Хейн');await openNpc('galate');if(await page.locator('[data-hellbound-action="walk"]').count()){await action('galate','walk');await openNpc('galate');}}
 await casian();await action('casian','start');assert.equal(s.game.worldQuests[130].condition,1);
 await galate();await action('galate','report');assert.equal(s.game.worldQuests[130].condition,2);
 await city('Глудин');await casian();await action('casian','crystal');assert.equal(s.game.worldQuests[130].items[12823],1);s.game=JSON.parse(JSON.stringify(s.game));
 await galate();await action('galate','complete');assert.ok(s.game.worldQuests[130].completedAt);assert.equal(s.game.worldQuests[130].items[12823],undefined);
 await openNpc('heine-gate');const gold=s.game.inventory.gold;await action('heine-gate','enter');await page.locator('.atlas-combat:not([hidden])').waitFor();assert.equal(s.game.world.location,'hellbound');assert.equal(s.game.inventory.gold,gold);assert.equal(await page.locator('.hunt-overlay,.atlas-room-host:not([hidden]) .hunt-ground').count(),0);await same();
 const initial=worldState(s,now).nativeField;assert.deepEqual(initial.point,source.entry);assert.ok(initial.actors.length>0);
 assert.ok((await page.getByRole('combobox',{name:'Регион',exact:true}).innerText()).includes(worldState(s,now).cities.find(c=>c.id===s.game.world.city).name));
 async function doors(open){
  await closePopup();await page.locator('[data-movement]').click();await page.locator('.atlas-popup > details').filter({has:page.locator('[data-hellbound-doors]')}).locator(':scope > summary').click();await page.locator('[data-hellbound-doors] > summary').click();
  assert.equal(await page.locator('[data-hellbound-doors] p').count(),4);assert.equal((await page.locator('[data-hellbound-doors]').innerText()).split(open?'Открыты':'Закрыты').length-1,4);assert.equal(await page.locator('.atlas-popup').evaluate(p=>p.scrollWidth<=p.clientWidth+1),true);await closePopup();
 }
 await doors(false);chat.game.hellbound.level=9;await page.waitForResponse(async r=>r.url().includes('/api/world?live=1')&&(await r.json()).world.nativeField?.doors?.filter(d=>d.open).length===4);await doors(true);
 chat.game.hellbound.level=1;await page.waitForResponse(async r=>r.url().includes('/api/world?live=1')&&(await r.json()).world.nativeField?.doors?.filter(d=>!d.open).length===4);await doors(false);
 if(noCanvas){const direction=[['east',200,0],['west',-200,0],['south',0,200],['north',0,-200]].find(([,x,y])=>findNativePath(initial.point,{x:initial.point.x+x,y:initial.point.y+y,z:initial.point.z},{allowed:nativeGroundAllowed,maxNodes:6000,reversible:true}).ok);assert.ok(direction);await page.locator(`[data-native-step="${direction[0]}"]`).click();}
 else{
  const box=await page.locator('.atlas-stage canvas').boundingBox(),scale=box.width/14000,visible=initial.actors.slice(0,width<700?8:16);
  const candidates=[1000,2000,3000,4000,5000].flatMap(n=>[[n,0],[-n,0],[0,n],[0,-n]]).map(([dx,dy])=>({x:initial.point.x+dx,y:initial.point.y+dy,z:initial.point.z,px:box.width/2+dx*scale,py:box.height/2+dy*scale}));
  const point=candidates.find(p=>p.px>24&&p.px<box.width-24&&p.py>24&&p.py<box.height-24&&visible.every(a=>Math.hypot(a.x-p.x,a.y-p.y)*scale>34)&&findNativePath(initial.point,p,{allowed:nativeGroundAllowed,maxNodes:6000,reversible:true}).ok);assert.ok(point);
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='native_move'),page.locator('.atlas-stage canvas').click({position:{x:point.px,y:point.py}})]);
 }
 await page.waitForTimeout(100);assert.ok(Math.hypot(worldState(s,now).nativeField.point.x-initial.point.x,worldState(s,now).nativeField.point.y-initial.point.y)>0);await same();
 const wounded=nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]).find(m=>m.currentHp>0),saved={id:wounded.instanceId,hp:Math.floor(wounded.hp/2)};wounded.currentHp=saved.hp;
 await closePopup();await page.locator('[data-movement]').click();await page.locator('[data-movement-tab="scroll"]').click();assert.equal(await page.locator('[data-leave]').count(),0);await page.locator('[data-escape]').click();now+=15000;
 await page.waitForResponse(async r=>r.url().includes('/api/world?live=1')&&(await r.json()).world.player.mode==='native');assert.equal(s.game.inventory.materials.scroll_escape,1);assert.ok(source.escape.points.some(p=>JSON.stringify(p)===JSON.stringify(s.game.world.nativePosition)));
 s.game=JSON.parse(JSON.stringify(s.game));await city('Хейн');await openNpc('heine-gate');if(await page.locator('[data-hellbound-action="walk"]').count()){await action('heine-gate','walk');await openNpc('heine-gate');}await action('heine-gate','enter');await page.locator('.atlas-combat:not([hidden])').waitFor();
 const copies=nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]).filter(m=>m.instanceId===saved.id);assert.equal(copies.length,1);assert.equal(copies[0].currentHp,saved.hp);await same();
 assert.equal(await page.locator('.atlas-panel').evaluate(p=>p.scrollWidth<=p.clientWidth+1),true);await page.screenshot({path:path.join(out,`quest-${width}${noCanvas?'-no-canvas':noImages?'-no-images':''}.png`)});
 assert.equal(requests.some(u=>u.includes('/vendor/phaser/')||u.includes('l2j-geodata')||u.endsWith('.gz')),false);assert.deepEqual(errors,[]);
 await page.locator('.atlas-panel>[data-close],.atlas-panel>.game-dialog-heading [data-close]').first().click();const before=requests.length;await page.waitForTimeout(2300);assert.equal(requests.length,before);assert.equal(await page.locator('.atlas-overlay,dialog[open],[inert]').count(),0);await page.close();
 console.log(`PASS Hellbound ${width}${noCanvas?' no Canvas':noImages?' no images':''}: original keeper fare, geodata walking, full quest, save, free admitted gate, one Atlas and cleanup`);
}}finally{await browser.close();}
