import {DRAGON_VORTICES} from '../../template/dragonVortex.js';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {LOCATION_LEVELS} from '../../template/locationLevels.js';
import {enterHuntField,moveHuntField,advanceHunt} from '../../functions/game/hunt/huntFight.js';
import {roomLayout,adjacent} from '../../functions/game/hunt/huntRooms.js';
import {getZone} from '../../functions/game/hunt/huntMobs.js';
import {FIELD_POPULATIONS} from '../../template/fieldPopulations.js';
import {initialPopulationSlots} from '../../functions/game/hunt/sourcePopulation.js';
import {createShipVoyage} from '../../functions/game/world/zakenShip.js';
import {ensureWorld,worldAction,bindWorldInstances} from '../../functions/game/world/world.js';
import {getHuntState} from '../../miniapp/hunt.js';
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
 const quiet=()=>s.game.hunt?.field?.mobs.forEach(m=>{m.aggroRange=0;m.aggro=false;m.nextAttackAt=now+1e9;});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><script type="module">import {openHuntGame} from '/hunt.js';window.openRoom=()=>openHuntGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>{const r=await fetch(url,options);const p=await r.json();if(!r.ok)throw Object.assign(new Error(p.reason),{payload:p});return p;}});</script></body>`});
  if(u==='/vendor/phaser/phaser.esm.min.js')return route.fulfill(mode==='unavailable'?{status:404}:{contentType:'text/javascript',body:fs.readFileSync('node_modules/phaser/dist/phaser.esm.min.js')});
  if(u==='/api/hunt')return route.fulfill({json:await getHuntState(s,now)});
  if(u==='/api/hunt/move'){
   const body=route.request().postDataJSON(),result=moveHuntField(s,body.direction||body.point,now);
   assert.ok(result.ok);now+=30000;quiet();advanceHunt(s,now,()=>.5);quiet();bindWorldInstances(chat,now);
   return route.fulfill({json:{...result,hunt:await getHuntState(s,now)}});
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
  now=Date.now();s={userId:1,game:{stats:{lvl:80,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
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
  if((FIELD_POPULATIONS[id]||id==='ivory-tower'&&f.number===3||f.ship)&&mode==='auto')await page.screenshot({path:path.join(out,`${id}-${stage??f.number}-${width}.png`)});
  await page.locator('.hunt-overlay [data-dismiss]').first().click();await page.waitForSelector('.hunt-overlay',{state:'detached'});
  assert.equal(await page.locator('dialog[open],[inert],.hunt-phaser canvas').count(),0);
 }
 assert.deepEqual(errors,[]);console.log(`PASS multilevel ${width}px ${mode}: ${cases.length} floors, navigation, focus and cleanup`);await page.close();
}}finally{await browser.close();}
