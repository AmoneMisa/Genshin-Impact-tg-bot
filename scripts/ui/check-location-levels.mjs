import {DRAGON_VORTICES} from '../../template/dragonVortex.js';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {LOCATION_LEVELS} from '../../template/locationLevels.js';
import {enterHuntField,moveHuntField,advanceHunt,ensureHunt,selectHuntTarget,useHuntSkill} from '../../functions/game/hunt/huntFight.js';
import {roomLayout,adjacent} from '../../functions/game/hunt/huntRooms.js';
import {getZone} from '../../functions/game/hunt/huntMobs.js';
import {FIELD_POPULATIONS} from '../../template/fieldPopulations.js';
import {initialPopulationSlots} from '../../functions/game/hunt/sourcePopulation.js';
import {createShipVoyage} from '../../functions/game/world/zakenShip.js';
import {ensureWorld,worldAction,bindWorldInstances} from '../../functions/game/world/world.js';
import {getHuntState} from '../../miniapp/hunt.js';
import {fieldPeers,useFieldPvpSkill} from '../../functions/game/hunt/fieldPvp.js';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import updateStats from '../../functions/game/player/updatePlayerStats.js';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/multilevel/ui');fs.mkdirSync(out,{recursive:true});
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const configurations=[{width:320,mode:'auto'},{width:390,mode:'auto'},{width:1100,mode:'auto'},{width:320,mode:'canvas'},{width:320,mode:'unavailable'},{width:320,mode:'missing-art'}];
try{for(const {width,mode} of configurations){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<500}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(mode==='canvas')await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
 let s,chat,now;
 const state=()=>getHuntState(s,now,fieldPeers(chat,s,now));
 const quiet=()=>{if(!s.game.hunt?.field)return;ensureHunt(s,now,()=>.5);const f=s.game.hunt.field;[...f.mobs,...Object.values(f.rooms||{}).flatMap(r=>r.mobs||[])].forEach(m=>{m.aggroRange=0;m.aggro=false;m.nextAttackAt=now+1e9;});};
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><script type="module">import {openHuntGame} from '/hunt.js';window.openRoom=()=>openHuntGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>{const r=await fetch(url,options);const p=await r.json();if(!r.ok)throw Object.assign(new Error(p.reason),{payload:p});return p;}});</script></body>`});
  if(u==='/vendor/phaser/phaser.esm.min.js')return route.fulfill(mode==='unavailable'?{status:404}:{contentType:'text/javascript',body:fs.readFileSync('node_modules/phaser/dist/phaser.esm.min.js')});
  if(u==='/api/hunt')return route.fulfill({json:await state()});
  if(u==='/api/hunt/target'||u==='/api/hunt/skill'){
   const body=route.request().postDataJSON(),result=u==='/api/hunt/target'?selectHuntTarget(s,body.targetId,now):body.targetUserId?useFieldPvpSkill(chat,s,body.targetUserId,body.skillIndex,{now,force:body.force,random:()=>.5}):useHuntSkill(s,body.skillIndex,{now,random:()=>.5});
   assert.ok(result.ok);
   if(u==='/api/hunt/skill'){now+=4500;quiet();advanceHunt(s,now,()=>.5);quiet();}
   return route.fulfill({json:{...result,hunt:await state()}});
  }
  if(u==='/api/hunt/move'){
   const body=route.request().postDataJSON(),result=moveHuntField(s,body.direction||body.point,now);
   assert.ok(result.ok);now+=30000;quiet();advanceHunt(s,now,()=>.5);quiet();bindWorldInstances(chat,now);
   return route.fulfill({json:{...result,hunt:await state()}});
  }
  if(u==='/api/world/action'){
   const body=route.request().postDataJSON();
   const result=body.action==='vortex_list'?{ok:true,encounters:[]}:worldAction(s,body,now);bindWorldInstances(chat,now);quiet();
   return route.fulfill({status:result.ok?200:409,json:{...result,world:{}}});
  }
  if(mode==='missing-art'&&u.startsWith('/art/world/scenes/'))return route.fulfill({status:404});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://levels.local/fixture');
 const floors=Object.entries(LOCATION_LEVELS).flatMap(([id,z])=>z.floors.map(f=>({id,f})));
 const focused=floors.filter(({id,f})=>id==='dragon-valley'||id==='pagan-temple'&&f.number>=3||id==='seed-of-destruction'&&f.number===1||id==='ivory-tower'&&f.number===3||id==='devils-isle'&&f.number===4||id==='tower-of-insolence'&&f.number===12||id==='cruma-tower'&&f.number===3);
 const selected=process.env.LOCATION_LEVEL_ZONE?floors.filter(({id})=>process.env.LOCATION_LEVEL_ZONE.split(',').includes(id)):mode==='auto'?(process.env.LOCATION_LEVEL_SMOKE?focused:floors):floors.filter(({id,f})=>id==='ivory-tower'&&f.number===3||id==='devils-isle'&&f.number===4);
 const cases=selected.flatMap(c=>c.id==='hellbound'?[0,1,4,11].map(stage=>({...c,stage})):[c]);
 for(const {id,f,stage} of cases){
  now=Date.now();s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
  chat={game:id==='hellbound'?{hellbound:{level:stage}}:{},members:[s]};s.ownerDocument=()=>chat;
  changeClass(s,'humanFighter');updateStats(s);ensureWorld(s,now);enterHuntField(s,id,{now,floor:f.number,random:()=>.5});Object.assign(s.game.world,{mode:'location',location:id});
  if(f.ship){const instance=createShipVoyage('fixture',[s],now,()=>0);chat.game.worldInstances={fixture:instance};s.game.world.instanceId='fixture';bindWorldInstances(chat,now);}
  if(id==='dragon-valley'){s.game.inventory.materials.l2_17248=1;const v=DRAGON_VORTICES[0];Object.assign(s.game.hunt.field,{room:v.room,...v.point});}
  if(FIELD_POPULATIONS[id]){
   const layout=roomLayout(getZone(id)),size=r=>initialPopulationSlots(r,s,id,()=>.5).length,target=[...layout.rooms].sort((a,b)=>size(b)-size(a))[0],queue=[[s.game.hunt.field.room]],seen=new Set(queue[0]);let path=[];
   while(queue.length){const next=queue.shift(),last=layout.rooms.find(r=>r.id===next.at(-1));if(last.id===target.id){path=next;break;}for(const r of layout.rooms)if(!seen.has(r.id)&&adjacent(last,r)){seen.add(r.id);queue.push([...next,r.id]);}}
   for(const room of path.slice(1)){quiet();assert.ok(moveHuntField(s,'room:'+room,now).ok);now+=30000;advanceHunt(s,now,()=>.5);quiet();assert.equal(s.game.hunt.field.room,room);}
   assert.equal(s.game.hunt.field.mobs.length,initialPopulationSlots(target,s,id,()=>.5).length,'densest source room');
  }
  quiet();await page.evaluate(()=>openRoom());await page.waitForSelector('.hunt-ground');
  assert.equal(await page.locator('.hunt-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,id+' overflow '+width);
  const heading=await page.locator('#hunt-heading').textContent();assert.ok(f.title.split(' · ').every(part=>heading.includes(part)));
  assert.ok(await page.locator('[data-target]').count()<=(width<500?8:16));
  for(const image of await page.locator('.hunt-actor img').all()){
   assert.match(await image.getAttribute('src'),/^\/art\/npcs\/l2\/\d+-128\.webp$/,'exact NPC photograph');
   await image.evaluate(img=>img.decode());
  }
  for(const [kind,color] of [['aggressive','rgb(255, 116, 116)'],['social','rgb(112, 201, 255)']])for(const node of await page.locator(`.ui-npc-name[data-disposition="${kind}"]`).all())assert.equal(await node.evaluate(n=>getComputedStyle(n).color),color,kind+' name color');
  if(id==='ivory-tower'&&f.number===3){await page.locator('[data-level-travel]').focus();await page.waitForTimeout(850);assert.equal(await page.locator('[data-level-travel]').evaluate(n=>n===document.activeElement),true,'navigation focus survives polling');}
  await page.locator('[data-level-travel]').click();const dialog=page.locator('dialog[open]');await dialog.waitFor();
  if(id==='hellbound'){assert.ok((await dialog.innerText()).includes(stage===0?'Хеллбаунд ещё закрыт':`Этап освобождения: ${stage}`));assert.equal(await dialog.locator('select,input').count(),0);}
  if(await dialog.evaluate(n=>n.scrollWidth>n.clientWidth+1)){
   await page.screenshot({path:path.join(out,`${id}-${width}-overflow.png`)});
   console.log(await dialog.evaluate(n=>[...n.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>n.getBoundingClientRect().right).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,80),width:e.getBoundingClientRect().width}))));
  }
  assert.equal(await dialog.evaluate(n=>n.scrollWidth>n.clientWidth+1),false,'travel overflow '+id);
  if(id==='necropolis-sacrifice'&&mode==='auto')await page.screenshot({path:path.join(out,`${id}-${width}-travel.png`)});
  if(id==='seed-of-destruction'&&f.number===1){
   assert.equal(await dialog.locator('[data-seed-create],[data-seed-join],[data-seed-mode],[data-seed-code]').count(),0,'Tiat needs no command channel controls');
   assert.ok((await dialog.innerText()).includes('Штурм Тиат · 9 игроков'),'Tiat shows the nine-player requirement');
  }
  await dialog.locator('[data-dismiss]').focus();assert.equal(await dialog.locator('[data-dismiss]').evaluate(n=>n===document.activeElement),true);
  if(id==='ivory-tower'&&f.number===3){
   const choice=dialog.locator('[data-travel-choice]').first();assert.equal(await choice.isDisabled(),false);
   await choice.click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));await page.waitForTimeout(100);
   await page.locator('[data-level-travel]').click();await page.locator('dialog[open] [data-travel-choice]').first().click();
   await page.waitForTimeout(100);assert.notEqual(s.game.hunt.field.floor,3,'Ivory teleporter changes floor after approach');
  }else await dialog.locator('[data-dismiss]').click();
  if(id==='dragon-valley'){
   await page.locator('[data-dragon-vortex]').first().click();const vortexDialog=page.locator('dialog[open]');await vortexDialog.waitFor();
   assert.equal(await vortexDialog.locator('[data-vortex-summon]').count(),1);
   assert.equal(await vortexDialog.evaluate(n=>n.scrollWidth>n.clientWidth+1),false,'vortex dialog overflow');
   await vortexDialog.locator('[data-vortex-summon]').focus();assert.equal(await vortexDialog.locator('[data-vortex-summon]').evaluate(n=>n===document.activeElement),true);
   if(mode==='auto')await page.screenshot({path:path.join(out,`dragon-vortex-${width}.png`)});
   await page.keyboard.press('Escape');await vortexDialog.waitFor({state:'detached'});
   s.game.inventory.materials.l2_17248=0;await page.locator('[data-dragon-vortex]').first().click();await page.locator('dialog[open]').waitFor();
   assert.equal(await page.locator('dialog[open] [data-vortex-summon]').isDisabled(),true,'summoning requires a bone');
   await page.keyboard.press('Escape');
  }
  if(f.ship){
   assert.ok(await page.locator('[data-ship-candle]').count());
   await page.locator('[data-ship-candle]').first().click();await page.waitForTimeout(100);
   await page.locator('[data-ship-candle]').first().click();await page.waitForTimeout(100);
   assert.equal(Object.keys(chat.game.worldInstances.fixture.candles).length,1);
  }
  if(id==='cruma-marshlands'){
   const field=s.game.hunt.field,layout=roomLayout(getZone(id)),current=layout.rooms.find(r=>r.id===field.room),east=current.col<layout.cols-1;
   Object.assign(field,{x:east?.96:.04,y:.7,path:[]});quiet();
   await page.waitForTimeout(1500);
   const oldRoom=field.room,oldIds=field.mobs.map(m=>m.instanceId);
   const point=await page.evaluate(async east=>{
    const {isoPoint}=await import('/hunt-isometric.js'),ground=document.querySelector('.hunt-ground'),world=document.querySelector('.hunt-world'),box=ground.getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(world).transform);
    const p=isoPoint({x:east?1.01:-.01,y:.7},{width:box.width,height:box.height});
    return {x:box.left+p.x+m.e,y:box.top+p.y+m.f};
   },east);
   await page.mouse.click(point.x,point.y);
   await page.waitForTimeout(250);
   if(field.room===oldRoom){await page.screenshot({path:path.join(out,'continuous-click-failure.png')});console.log('crossing click',point,await page.evaluate(p=>({hit:document.elementFromPoint(p.x,p.y)?.outerHTML.slice(0,300),hero:document.querySelector('.hunt-hero-marker')?.style.cssText,world:document.querySelector('.hunt-world')?.style.cssText}),point));}
   assert.notEqual(field.room,oldRoom,'click on neighbouring terrain crosses the boundary');
   assert.deepEqual(field.rooms[oldRoom].mobs.map(m=>m.instanceId),oldIds,'streaming retains the old actors');
   assert.equal(await page.locator('.hunt-overlay').count(),1,'crossing keeps the same game screen');
   assert.ok(await page.locator('[data-terrain-cell]').count()<=9,'bounded terrain stream');
   assert.equal(await page.locator('.hunt-phaser canvas').count(),0,'surface needs no canvas or WebGL');
   assert.ok(await page.locator('.hunt-hero-marker').evaluate(n=>{const a=n.getBoundingClientRect(),b=n.closest('.hunt-ground').getBoundingClientRect();return a.right>b.left&&a.left<b.right&&a.bottom>b.top&&a.top<b.bottom;}),'camera retains the hero');
   const target=field.rooms[oldRoom].mobs[0];assert.ok(target);
   changeClass(s,'mage');updateStats(s);Object.assign(field,{x:east?.04:.96,y:.6,path:[]});Object.assign(target,{x:east?.96:.04,y:.6,currentHp:1});quiet();
   await page.waitForTimeout(1500);
   await page.locator(`[data-target="${target.instanceId}"]`).click();
   assert.equal(field.target,target.instanceId,'neighbour target selection');
   if(mode==='auto')await page.screenshot({path:path.join(out,`neighbour-combat-${width}.png`)});
   const kills=s.game.hunt.kills||0;await page.locator('[data-skill="0"]').first().click();await page.waitForTimeout(250);
   assert.equal(s.game.hunt.kills,kills+1,'real cast kills a target across the boundary');
   assert.ok(!field.rooms[oldRoom].mobs.some(m=>m.instanceId===target.instanceId));
   assert.ok(field.respawns.some(r=>r.room===target.sourceRoom&&r.sourceSlot===target.sourceSlot));
   assert.ok(await page.locator('[data-target]').count()<=(width<500?8:16),'nearby actors share the same DOM limit');
   const peer=JSON.parse(JSON.stringify(s));peer.userId=2;peer.userChatData.user.id=2;peer.ownerDocument=()=>chat;
   const pf=peer.game.hunt.field;pf.rooms[pf.room]={mobs:pf.mobs};pf.mobs=pf.rooms[oldRoom].mobs;delete pf.rooms[oldRoom];
   Object.assign(pf,{room:oldRoom,x:east?.96:.04,y:.6,path:[],seenAt:now,walls:layout.rooms.find(r=>r.id===oldRoom).walls});
   peer.game.worldPvp={flagUntil:now+120000};chat.members.push(peer);s.game.gameClass.skills[0].cooldownReceive=0;
   const cp=peer.game.gameClass.stats.cp,peerX=pf.x;
   await page.waitForTimeout(1500);await page.locator('.hunt-player-marker[data-pvp-target="2"]').click();
   assert.equal(await page.locator('.hunt-player-marker[data-pvp-target="2"]').getAttribute('aria-pressed'),'true','select neighbouring player');
   await page.locator('[data-skill="0"]').first().click();await page.waitForTimeout(250);
   assert.ok(peer.game.gameClass.stats.cp<cp,'real PvP damages neighbouring player CP');assert.equal(pf.x,peerX,'projection preserves canonical coordinates');
   assert.ok(await page.locator('.hunt-player-marker[data-pvp-target]').count()<=(width<500?8:16),'bounded player markers');
   if(mode==='auto')await page.screenshot({path:path.join(out,`neighbour-pvp-${width}.png`)});
  }
  if((FIELD_POPULATIONS[id]||id==='ivory-tower'&&f.number===3||f.ship)&&mode==='auto')await page.screenshot({path:path.join(out,`${id}-${stage??f.number}-${width}.png`)});
  await page.locator('.hunt-overlay [data-dismiss]').first().click();await page.waitForSelector('.hunt-overlay',{state:'detached'});
  assert.equal(await page.locator('dialog[open],[inert],.hunt-phaser canvas').count(),0);
 }
 assert.deepEqual(errors,[]);console.log(`PASS multilevel ${width}px ${mode}: ${cases.length} floors, navigation, focus and cleanup`);await page.close();
}}finally{await browser.close();}
