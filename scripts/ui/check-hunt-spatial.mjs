import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import updateStats from '../../functions/game/player/updatePlayerStats.js';
import {enterHuntField,moveHuntField,selectHuntTarget,setHuntAttack,useHuntSkill} from '../../functions/game/hunt/huntFight.js';
import {getHuntState} from '../../miniapp/hunt.js';
import {useFieldPvpSkill} from '../../functions/game/hunt/fieldPvp.js';
import l2 from '../../template/l2Classes.js';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright'),root=path.resolve('webapp');
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const {width,mode} of [{width:320,mode:'auto'},{width:390,mode:'auto'},{width:1100,mode:'auto'},{width:320,mode:'canvas'},{width:390,mode:'unavailable'}].filter(c=>!process.env.HUNT_RENDER_MODE||c.mode===process.env.HUNT_RENDER_MODE)){
 const s={userId:0,userChatData:{user:{id:0,first_name:'White Amorality'}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);enterHuntField(s,'catacomb-forbidden-path');
 s.game.hunt.field.mobs.forEach(m=>{m.aggressive=false;m.nextAttackAt=Date.now()+1e6;});
 let peer=null,preview16=false,reads=0;
 const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce',hasTouch:width<500}),errors=[],posts=[];
 const instrumentation=mode==='unavailable'?'':`const {Game}=await import('/vendor/phaser/phaser.esm.min.js');const boot=Game.prototype.boot;Game.prototype.boot=function(){window.huntEngine=this;window.renderFrames=0;this.events.on('postrender',()=>window.renderFrames++);return boot.call(this);};`;
 if(mode==='canvas')await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/vendor/phaser/phaser.esm.min.js')return mode==='unavailable'?route.fulfill({status:503}):route.fulfill({contentType:'text/javascript',body:fs.readFileSync('node_modules/phaser/dist/phaser.esm.min.js')});
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><script type="module">import {openHuntGame} from '/hunt.js';${instrumentation}window.openHuntFixture=()=>openHuntGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>{const r=await fetch('/fixture',{method:'POST',body:JSON.stringify({url,body:options?.body?JSON.parse(options.body):null})});return r.json();}});openHuntFixture();</script></body></html>`});
  if(url.pathname==='/fixture-scene'){
   const {scenario}=route.request().postDataJSON();preview16=true;
   peer=structuredClone(s);peer.userId=2;peer.userChatData={user:{id:2,first_name:'Night Raven'}};
   changeClass(peer,'duelist');updateStats(peer);peer.game.clanName='Moon Guard';
   peer.game.worldPvp={karma:scenario==='pk'?300:0,flagUntil:0,log:[],effects:{}};
   s.game.worldPvp={karma:0,flagUntil:0,log:[],effects:{}};
   s.game.gameClass.stats.hp=1415;s.game.gameClass.stats.cp=566;
   Object.assign(s.game.hunt.field,{x:.4,y:.75,path:[],seenAt:Date.now()});
   Object.assign(peer.game.hunt.field,{x:.6,y:.65,path:[],seenAt:Date.now()});
   const chat={members:[s,peer]};
   if(scenario!=='neutral'){
    assert.ok(useFieldPvpSkill(chat,peer,s.userId,0,{force:true,random:()=>.5}).ok);
    if(scenario==='pvp')assert.ok(useFieldPvpSkill(chat,s,peer.userId,0,{random:()=>.5}).ok);
   }
   return route.fulfill({contentType:'application/json',body:'{}'});
  }
  if(url.pathname==='/fixture'){
   const {url:api,body}=route.request().postDataJSON();let result={ok:true};
   if(!body)reads++;
   if(body){posts.push({api,body});
    if(api==='/api/hunt/move')result=moveHuntField(s,body.point||body.direction);
    if(api==='/api/hunt/target')result=selectHuntTarget(s,body.targetId);
    if(api==='/api/hunt/attack')result=setHuntAttack(s,body.enabled);
    if(api==='/api/hunt/skill')result=useHuntSkill(s,body.skillIndex);
   }
   const hunt=await getHuntState(s,Date.now(),peer?[peer]:[]);
   if(preview16){
    // Rendering fixture only: sixteen original L2 abilities, without granting any skills to the character.
    const names=['Attack','Triple Slash','Double Sonic Slash','Triple Sonic Slash','Sonic Blaster','Sonic Buster','Sonic Storm','War Cry','Battle Roar','Dash','Lionheart','Duelist Spirit','Sonic Focus','Sonic Move','Sonic Rage','Sonic Barrier'];
    const base=hunt.player.skills[0];
    hunt.player.skills=names.map((name,index)=>{const row=Object.values(l2.skills).find(r=>r.name===name);return {...base,index,name,costMp:Number(row?.mp?.at(-1))||0,locked:false,canUse:true,cooldownUntil:0,cooldownMs:0};});
    hunt.player.hotbar=names.map((_,index)=>index);
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body?{...result,hunt}:hunt)});
  }
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');await page.waitForSelector('.hunt-overlay.visible');
 if(mode!=='unavailable'){
  await page.waitForSelector('.hunt-phaser-ready canvas');
  assert.equal(await page.locator('.hunt-phaser').getAttribute('data-renderer'),mode==='canvas'?'canvas':'webgl');
  await page.waitForSelector('.hunt-avatar-painted');
  assert.equal(await page.evaluate(()=>huntEngine.loop.running),false,'no independent Phaser animation loop');
 }else{
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.hunt-phaser-ready').count(),0);
  assert.ok(await page.locator('.hunt-isometric-terrain').isVisible(),'SVG remains playable if the engine cannot load');
 }
 // The embedding screen owns visibility; neither polling nor drawing runs in a hidden tab.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(150);
 const hiddenFrames=await page.evaluate(()=>window.renderFrames),hiddenPosts=posts.length,hiddenReads=reads;
 await page.waitForTimeout(850);
 assert.equal(await page.evaluate(()=>window.renderFrames),hiddenFrames);
 assert.equal(posts.length,hiddenPosts);
 assert.equal(reads,hiddenReads,'no polling in a hidden tab');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.getByRole('button',{name:'Стоп',exact:true}).count(),0,'no standalone Stop button');
 assert.equal(await page.locator('.hunt-scene .hunt-ground').count(),1,'one scene contains the world');
 assert.equal(await page.locator('.hunt-scene .hunt-controls').count(),1,'controls belong to the same scene');
 assert.equal(await page.locator('[data-world-stairs]').count(),0,'one-floor fields do not show useless stairs');
 assert.equal(await page.locator('.hunt-exit').count(),2,'entrance has only its two neighbouring exits');
 assert.equal(await page.locator('.hunt-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,'dialog has no horizontal overflow');
 const skill=await page.locator('[data-skill]').first().boundingBox();assert.ok(skill.y+skill.height<844,'skills visible without scrolling');
 await page.locator('[data-attack]').click();await page.waitForFunction(()=>document.querySelector('[data-attack]')?.getAttribute('aria-pressed')==='true');assert.ok(s.game.hunt.field.autoAttack);
 await page.locator('[data-attack]').click();await page.waitForFunction(()=>document.querySelector('[data-attack]')?.getAttribute('aria-pressed')==='false');assert.equal(s.game.hunt.field.autoAttack,undefined);
 const targets=page.locator('[data-target]');
 await targets.nth(1).click();assert.equal(s.game.hunt.field.target,s.game.hunt.field.mobs[1].instanceId);
 await page.locator('[data-next-target]').click();assert.equal(s.game.hunt.field.target,s.game.hunt.field.mobs[2].instanceId);
 await page.waitForSelector('.hunt-overlay:not(.busy)');
 await page.waitForSelector('.hunt-ground');
 const panBox=await page.locator('.hunt-ground').boundingBox(),beforePan=posts.length;
 await page.mouse.move(panBox.x+12,panBox.y+30);await page.mouse.down();await page.mouse.move(panBox.x+42,panBox.y+42,{steps:4});await page.mouse.up();
 assert.equal(posts.length,beforePan,'dragging the camera never walks or selects a target');
 assert.match(await page.locator('.hunt-world').getAttribute('style'),/translate\(30px,\s*12px\)/);
 await page.mouse.move(panBox.x+panBox.width/2,panBox.y+panBox.height/2);await page.mouse.wheel(0,-100);
 await page.waitForFunction(()=>document.querySelector('.hunt-world')?.style.transform.includes('scale(1.1)'));
 await page.waitForTimeout(120);
 const groundPoint=await page.evaluate(async()=>{const {isoPoint}=await import('/hunt-isometric.js');const node=document.querySelector('.hunt-ground');return isoPoint({x:.65,y:.8},{width:node.clientWidth,height:node.clientHeight},{x:30,y:12,zoom:1.1});});

 await page.locator('.hunt-ground').click({position:groundPoint});
 await page.waitForFunction(()=>document.querySelector('.hunt-action-state')?.textContent==='Перемещение');
 assert.ok(posts.some(p=>p.api==='/api/hunt/move'&&p.body.point));
 const pickedMove=posts.findLast(p=>p.body.point)?.body.point;assert.ok(Math.abs(pickedMove.x-.65)<.01&&Math.abs(pickedMove.y-.8)<.01,'screen pick includes the actual camera transform');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.hunt-action-state')?.textContent==='Готов к действию');
 await page.locator('.hunt-exit.east').click();assert.equal(s.game.hunt.field.pendingRoom,'r0c1');
 await page.waitForFunction(()=>document.querySelector('.hunt-action-state')?.textContent==='Идём к выходу');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.hunt-action-state')?.textContent==='Готов к действию');assert.equal(s.game.hunt.field.pendingRoom,undefined);
 await page.locator('[data-combat-details="menu"]>summary').click();
 await page.locator('[data-combat-details="rooms"] summary').click();
 await page.waitForTimeout(850);assert.equal(await page.locator('[data-combat-details="rooms"]').getAttribute('open'),'');
 await page.locator('[data-combat-details="rooms"] summary').click();
 await page.locator('[data-view-reset]').click();
 await page.locator('[data-combat-details="menu"]>summary').click();
 await page.locator('[data-next-target]').focus();
 await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-next-target'));
 await page.locator('[data-attack]').click();await page.waitForFunction(()=>document.querySelector('[data-attack]')?.getAttribute('aria-pressed')==='true');await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.querySelector('[data-attack]')?.getAttribute('aria-pressed')==='false');
 assert.equal(await page.locator('.hunt-overlay').count(),1,'Escape first stops the action');assert.equal(s.game.hunt.field.autoAttack,undefined);
 if(width===390&&mode==='auto')await page.screenshot({path:'docs/hunt-spatial-390.png',fullPage:true});
 for(const scenario of ['neutral','pvp','pk']){
  await page.evaluate(async scenario=>{await fetch('/fixture-scene',{method:'POST',body:JSON.stringify({scenario})});},scenario);
  await page.waitForSelector('[data-pvp-target="2"]');
  const expected=scenario==='pvp'?'flagged':scenario==='pk'?'pk':'neutral';
  await page.waitForSelector(`.hunt-player-marker.ui-pvp-${expected}`);
  await page.locator('.hunt-player-marker[data-pvp-target="2"] .hunt-iso-avatar').click();
  await page.waitForSelector(`.hunt-player-marker.ui-pvp-${expected}.selected`);
  assert.equal(await page.locator('.mmo-hotbar[data-slot-count="16"]>.mmo-skill').count(),16,'sixteen ability slots');
  assert.equal(await page.locator('.hunt-scene-target,.hunt-peer-target').count(),0,'no separate target panel');
  assert.equal(await page.locator('.hunt-player-marker .mmo-bar').count(),0,'other players never show HP or CP');
  assert.equal(await page.locator('.hunt-presence-clan').innerText(),'Moon Guard');
  assert.equal(await page.locator('.hunt-actor .hunt-mob-percent').count(),3);
  assert.equal(await page.locator('.hunt-actor .hunt-mob-name').count(),3);
  assert.equal(await page.locator('.hunt-actor .hunt-actor-hp,.hunt-actor .hunt-actor-portrait>i').count(),0,'only monster name, percentage and avatar');
  assert.equal(await page.locator('[data-force-attack]').count(),scenario==='neutral'?1:0,'force is only offered against a peaceful player');
  if(mode!=='unavailable'){
   await page.waitForFunction(()=>[...document.querySelectorAll('.hunt-iso-actor:has(img)')].every(n=>n.classList.contains('hunt-avatar-painted')));
   const opacity=await page.locator('.hunt-avatar-painted>.hunt-iso-avatar').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).opacity));
   assert.ok(opacity.every(o=>o==='0'),'portraits are painted once, without an HTML duplicate');
  }
  assert.equal(await page.locator('.hunt-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
  const last=await page.locator('.mmo-hotbar[data-slot-count="16"]>.mmo-skill').last().boundingBox();assert.ok(last.y+last.height<=844);
  if(scenario!=='neutral')assert.equal(await page.locator('.hunt-scene-notice').count(),1,'actual attack log is visible');
  if(width===390&&mode==='auto')await page.screenshot({path:`docs/hunt-unified-${scenario}-390.png`,fullPage:true});
 }
 if(mode==='auto'){
  const canvas=await page.locator('.hunt-phaser canvas').elementHandle();
  await canvas.evaluate(n=>n.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  assert.equal(await page.locator('.hunt-phaser-ready').count(),0,'context loss restores lightweight field');
  assert.equal(await page.locator('.hunt-avatar-painted').count(),0,'original portraits return');
  await page.locator('[data-next-target]').click();
  await page.waitForSelector('.hunt-actor.selected');
 }
 await page.locator('[data-dismiss]').click();await page.waitForSelector('.hunt-overlay',{state:'detached'});
 const count=posts.length,closedReads=reads,closedFrames=await page.evaluate(()=>window.renderFrames);await page.waitForTimeout(850);assert.equal(posts.length,count,'no actions after closing');
 assert.equal(reads,closedReads,'no polling after closing');
 assert.equal(await page.evaluate(()=>window.renderFrames),closedFrames,'no rendering after closing');
 await page.evaluate(()=>openHuntFixture());await page.waitForSelector('.hunt-overlay.visible');
 if(mode!=='unavailable')await page.waitForSelector('.hunt-phaser-ready canvas');
 await page.locator('[data-dismiss]').click();await page.waitForSelector('.hunt-overlay',{state:'detached'});
 assert.deepEqual(errors,[]);await page.close();console.log(`Spatial combat ${width}px ${mode}: renderer, target, walking, exits, hotbar, reduced motion and cleanup passed`);
}}finally{await browser.close();}
