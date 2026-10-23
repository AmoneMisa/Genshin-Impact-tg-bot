import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';import {worldAction,worldState,advanceWorld,enterZakenShip,CITY_NPCS,CITIES,cityPoint} from '../../functions/game/world/world.js';
import {getHuntState} from '../../miniapp/hunt.js';import {advanceHunt,moveHuntField,selectHuntTarget,setHuntAttack,enterHuntField} from '../../functions/game/hunt/huntFight.js';
import {levelTransitions} from '../../functions/game/hunt/locationLevels.js';
import pilot from '../../template/nativeFieldPilot.js';
import {getZone,getZones} from '../../functions/game/hunt/huntMobs.js';import {roomLayout,adjacent} from '../../functions/game/hunt/huntRooms.js';
import {nativeFieldBuckets} from '../../functions/game/world/nativeFieldSpace.js';import routes from '../../template/nativeRoutes.js';import {LOCATIONS} from '../../template/worldMap.js';
import change from '../../functions/game/player/changePlayerGameClass.js';import update from '../../functions/game/player/updatePlayerStats.js';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const start=process.env.ATLAS_ROOM_START||'walk';
const smoke=process.env.ATLAS_ROOM_SMOKE==='1',requested=process.env.ATLAS_ROOM_ZONE||'cruma-tower',zones=requested==='adapted'?getZones().filter(z=>!z.instance&&!pilot.fields[z.id]).map(z=>z.id):requested.split(','),root=path.resolve('webapp');
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const cases=(smoke?[{width:320},{width:1100}]:[{width:320},{width:390},{width:1100},{width:320,noCanvas:true},{width:320,noImages:true}]).filter(c=>!process.env.ATLAS_ROOM_WIDTH||c.width===Number(process.env.ATLAS_ROOM_WIDTH));
try{for(const zone of zones){const location=LOCATIONS.find(l=>l.id===zone),city=routes.routes[zone]?.city||location.region,zoneName=location.name,out=path.resolve('.tmp/atlas-room-ui',zone);fs.mkdirSync(out,{recursive:true});for(const {width,noCanvas=false,noImages=false}of cases){
 let now=1800000000000;const s={userId:1,userChatData:{user:{id:1,first_name:'Test'}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{scroll_escape:1},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city,x:.5,y:.5,path:[],moveAt:now,locks:{}}}};
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);
 if(start==='room'){assert.ok(enterHuntField(s,zone,{now,random:()=>.5}).ok);Object.assign(s.game.world,{mode:'location',location:zone});}
 if(start==='church'){const npc=CITY_NPCS.find(n=>n.service==='pagan-church');Object.assign(s.game.world,cityPoint(CITIES.find(c=>c.id==='rune'),npc));assert.ok(worldAction(s,{action:'pagan_church'},now).ok);}
 if(start==='ship'){
  assert.ok(enterHuntField(s,zone,{now,random:()=>.5,floor:3}).ok);Object.assign(s.game.world,{mode:'location',location:zone});
  const peer=JSON.parse(JSON.stringify(s));peer.userId=2;peer.ownerDocument=()=>chat;chat.members.push(peer);
  for(const member of chat.members){member.game.party={id:'crew',leaderId:'1'};const f=member.game.hunt.field,d=levelTransitions(zone,f).destinations.find(d=>d.floor===4);f.rooms[f.room]={mobs:f.mobs};Object.assign(f,{room:d.room,...d.point,mobs:[],target:null});member.game.hunt.mob=null;}
  assert.ok(enterZakenShip(s,now,()=>0).ok);
 }
 const quiet=()=>{for(const m of nativeFieldBuckets(s.game.hunt?.field).flatMap(b=>b.mobs||[]))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:now+1e9});};
 const dto=()=>{advanceWorld(s,now);quiet();return {world:{...worldState(s,now),holdings:[],corpses:[]}};};
 let holdRead=false,releaseRead=null,holdAttack=false;
 const page=await browser.newPage({viewport:{width,height:Number(process.env.ATLAS_ROOM_HEIGHT)||900},hasTouch:width<500,reducedMotion:'reduce'}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 if(noCanvas)await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;requests.push(u);
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/world')return route.fulfill({json:dto()});if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/hunt'){quiet();const snapshot=JSON.parse(JSON.stringify(await getHuntState(s,now)));if(holdRead){holdRead=false;await new Promise(resolve=>{releaseRead=resolve;});}try{return await route.fulfill({json:snapshot});}catch(error){if(!route.request().failure())throw error;return;}}
  if(u==='/api/combat/chat')return route.fulfill({json:{ok:true,messages:[]}});
  if(u==='/api/world/action'){quiet();now+=100;const result=worldAction(s,route.request().postDataJSON(),now);quiet();return route.fulfill({status:result.ok?200:409,json:{...result,...dto(),hunt:await getHuntState(s,now)}});}
  if(u==='/api/hunt/flee'){quiet();const result=worldAction(s,{action:'escape'},now);assert.ok(result.ok);now=s.game.world.channel.until;advanceWorld(s,now);return route.fulfill({json:{...result,hunt:await getHuntState(s,now)}});}
  if(['/api/hunt/move','/api/hunt/target','/api/hunt/attack'].includes(u)){
   quiet();now+=100;const body=route.request().postDataJSON(),result=u.endsWith('/move')?moveHuntField(s,body.point||body.direction,now):u.endsWith('/target')?selectHuntTarget(s,body.targetId,now):setHuntAttack(s,body.enabled,now);
   if(u.endsWith('/move')){for(let i=0;i<6&&(s.game.hunt.field.path?.length||s.game.hunt.field.crossing);i++){now+=20000;s.game.hunt.field.seenAt=now;advanceHunt(s,now,()=>.5);quiet();}}
   if(u.endsWith('/attack')&&body.enabled&&!holdAttack){for(let i=0;i<80&&!s.game.hunt.kills;i++){now+=2000;s.game.hunt.field.seenAt=now;quiet();advanceHunt(s,now,()=>.5);}assert.equal(s.game.hunt.kills,1);}
   return route.fulfill({status:result.ok?200:409,json:{...result,hunt:await getHuntState(s,now)}});
  }
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  if(noImages&&/\.(webp|png|jpg)$/.test(u))return route.fulfill({status:404});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://rooms.local/fixture');await page.evaluate(async()=>{await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();const statusElement=document.createElement('p');document.body.append(statusElement);const api=async(u,o)=>{const r=await fetch(u,o),d=await r.json();if(!r.ok){const e=new Error(d.reason);e.payload=d;throw e;}return d;};await(await import('/world-map.js')).openWorldMap({api,statusElement});window.originalAtlas=document.querySelector('.atlas-panel');window.originalCanvas=document.querySelector('.atlas-stage canvas');});
 if(start==='walk'||start==='quick'){await page.locator('[data-movement]').click();await page.getByRole('combobox',{name:'Разделы телепорта',exact:true}).click();await page.getByRole('option',{name:'Охота',exact:true}).click();await page.locator('[data-quick-go]').filter({hasText:zoneName}).click();if(start==='quick'){await page.locator('[data-quick-confirm]').click();}else{await page.locator('[data-native-walk]').click();assert.ok(s.game.world.walkHome?.native);now=s.game.world.walkHome.until+1;}}
 await page.locator('.atlas-room-host:not([hidden]) .hunt-ground').waitFor();assert.equal(s.game.world.mode,'location');assert.equal(await page.locator('.hunt-overlay').count(),0);assert.equal(await page.locator('.atlas-overlay').count(),1);
 const same=async()=>assert.equal(await page.evaluate(()=>window.originalAtlas===document.querySelector('.atlas-panel')&&window.originalCanvas===document.querySelector('.atlas-stage canvas')),true);await same();
 const all=()=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]),victim=all().find(m=>m.instanceId===s.game.hunt.field.target);if(victim&&!smoke){if(process.env.ATLAS_ROOM_RACE==='1'){holdRead=true;await page.waitForRequest(r=>new URL(r.url()).pathname==='/api/hunt');while(!releaseRead)await page.waitForTimeout(10);}victim.currentHp=1;
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/hunt/attack')),page.locator('.atlas-room-host [data-attack]').first().click()]);assert.equal(s.game.hunt.kills,1);releaseRead?.();await page.waitForTimeout(100);assert.equal(await page.locator('.atlas-room-host [data-target="'+victim.instanceId+'"]').count(),0);}
 const survivor=all()[0];if(survivor)survivor.currentHp=Math.floor(survivor.hp*.4);const saved=survivor&&{id:survivor.instanceId,hp:survivor.currentHp},first=s.game.hunt.field.floor;
 async function travel(floor){
  let field=(await getHuntState(s,now)).field;const destination=field.level.destinations.find(d=>d.floor===floor);assert.ok(destination);
  const layout=roomLayout(getZone(zone),field.floor),queue=[[field.room.id]],seen=new Set(queue[0]);let steps;
  while(queue.length){const path=queue.shift(),r=layout.rooms.find(r=>r.id===path.at(-1));if(r.id===destination.room){steps=path.slice(1);break;}for(const next of layout.rooms)if(!seen.has(next.id)&&adjacent(r,next)){seen.add(next.id);queue.push([...path,next.id]);}}
  assert.ok(steps);
  for(const id of steps){await page.locator('.atlas-room-host [data-level-travel]').click();const dialog=page.getByRole('dialog',{name:'Переходы между этажами',exact:true});await dialog.locator('details>summary').click();await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/hunt/move')),dialog.locator(`[data-room="${id}"]`).click()]);assert.equal(s.game.hunt.field.room,id);await page.waitForTimeout(60);}
  for(let i=0;i<3&&s.game.hunt.field.floor!==floor;i++){field=(await getHuntState(s,now)).field;const index=field.level.destinations.findIndex(d=>d.floor===floor);await page.locator('.atlas-room-host [data-level-travel]').click();const dialog=page.getByRole('dialog',{name:'Переходы между этажами',exact:true});await dialog.locator(`[data-travel-choice="${index}"]`).click();await page.waitForTimeout(100);}
  assert.equal(s.game.hunt.field.floor,floor);await same();
 }
 if(!smoke){const destinations=(await getHuntState(s,now)).field.level.destinations,second=(destinations.find(d=>d.floor>first)||destinations[0])?.floor;assert.ok(second);await travel(second);s.game=JSON.parse(JSON.stringify(s.game));if(start==='church'){assert.equal((await getHuntState(s,now)).field.level.destinations.some(d=>d.floor===3),false);await travel(1);}await travel(first);
 if(saved)assert.equal(all().find(m=>m.instanceId===saved.id)?.currentHp,saved.hp);assert.equal(s.game.hunt.kills,victim?1:0);}
 if(!smoke&&victim){holdAttack=true;await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/hunt/attack')),page.locator('.atlas-room-host [data-attack]').first().click()]);assert.ok(s.game.hunt.field.autoAttack);await page.locator('.atlas-panel>[data-close],.atlas-panel>.game-dialog-heading [data-close]').first().focus();await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/hunt/attack')),page.keyboard.press('Escape')]);assert.equal(Boolean(s.game.hunt.field.autoAttack),false);holdAttack=false;await same();}
 await page.locator('[data-mode="world"]').click();assert.equal(await page.locator('.atlas-room-host').isHidden(),true);const count=requests.filter(u=>u==='/api/hunt').length;await page.waitForTimeout(2300);assert.equal(requests.filter(u=>u==='/api/hunt').length,count,'hidden room has no hunt poller');
 await page.locator('[data-mode="city"]').click();await page.locator('.atlas-room-host:not([hidden]) .hunt-ground').waitFor();await same();
 assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);assert.equal(await page.locator('.atlas-room-host').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 const layoutCheck=await page.locator('.atlas-panel').evaluate(panel=>{const p=panel.getBoundingClientRect(),b=panel.querySelector('[data-movement]').getBoundingClientRect();return {panelBottom:p.bottom,buttonTop:b.top,buttonBottom:b.bottom,height:innerHeight};});assert.ok(layoutCheck.buttonBottom<=layoutCheck.height+1,JSON.stringify(layoutCheck));
 await page.screenshot({path:path.join(out,`room-${width}${noCanvas?'-no-canvas':noImages?'-no-images':''}.png`)});
 assert.equal(requests.some(u=>u.includes('/vendor/phaser/')),false,'embedded room never loads WebGL');assert.deepEqual(errors,[]);
 await page.locator('.atlas-room-host [data-bar-edit]').click();await page.locator('.atlas-room-host [data-combat-details="travel"]>summary').click();await page.locator('.atlas-room-host [data-flee]').click();await page.waitForFunction(()=>document.querySelector('.atlas-room-host').hidden);assert.equal(s.game.world.mode,'city');assert.equal(s.game.inventory.materials.scroll_escape,0);await same();assert.equal(await page.locator('.hunt-overlay').count(),0);assert.deepEqual(errors,[]);
 await page.locator('.atlas-panel>[data-close],.atlas-panel>.game-dialog-heading [data-close]').first().click();await page.waitForSelector('.atlas-panel',{state:'detached'});const closedRequests=requests.length;await page.waitForTimeout(2300);assert.equal(requests.length,closedRequests);assert.equal(await page.locator('dialog[open],[inert]').count(),0);
 await page.close();console.log(`PASS Atlas room ${zone} ${start} ${width}${noCanvas?' no Canvas':noImages?' no images':''}: ${smoke?'room and tabs':'combat, floor roundtrip and save'}, return scroll, same Atlas, hidden/closed cleanup`);
}}}finally{await browser.close();}
