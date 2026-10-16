import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import updateStats from '../../functions/game/player/updatePlayerStats.js';
import {enterHuntField,useHuntSkill,advanceHunt} from '../../functions/game/hunt/huntFight.js';
import {getHuntState} from '../../miniapp/hunt.js';
import {SCENE_STUDIES} from '../../webapp/scene-catalog.js';
const expansion=process.env.COMBAT_EXPANSION==='1';
const epicEnvironments=Object.fromEntries(SCENE_STUDIES.filter(s=>s.category==='epic').map(s=>[s.id,s.environment]));
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright'),root=path.resolve('webapp');
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const width of [320,390,1100].filter(w=>!process.env.COMBAT_WIDTH||w===Number(process.env.COMBAT_WIDTH))){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[],assetReads=new Map();
 page.on('pageerror',e=>errors.push(e.message));
 let s,now;
 function prepare(zone){
  now=Date.now();s={userId:1,userChatData:{user:{id:1,first_name:'White Amorality'}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
  changeClass(s,'humanFighter');updateStats(s);enterHuntField(s,zone,{now,random:()=>.5});s.game.hunt.field.mobs.forEach(m=>{m.aggressive=false;m.nextAttackAt=now+1e6;});
 }
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.startsWith('/art/world/')&&url.pathname.endsWith('.webp'))assetReads.set(url.pathname,(assetReads.get(url.pathname)||0)+1);
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><script type="module">
   import {openHuntGame} from '/hunt.js';import {createBossStage} from '/boss-stage.js';
   window.openRoom=()=>openHuntGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async()=>{const r=await fetch('/state');return r.json();}});
   let bossStage;window.showBoss=name=>{bossStage?.destroy();document.body.innerHTML='<section class="boss-panel game-dialog-panel" style="width:min(534px,100%);padding:12px"><div class="boss-stage" id="stage"></div></section>';bossStage=createBossStage(document.querySelector('#stage'),{name,label:name,hpPercent:88,player:{name:'White Amorality',className:'humanFighter',gender:'male'}});};
   window.bossEffect=()=>bossStage.playSkill('damage',{crit:true});window.closeBoss=()=>{bossStage?.destroy();document.body.innerHTML='';};
  </script></body>`});
  if(url.pathname==='/vendor/phaser/phaser.esm.min.js')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync('node_modules/phaser/dist/phaser.esm.min.js')});
  if(url.pathname==='/state')return route.fulfill({contentType:'application/json',body:JSON.stringify(await getHuntState(s,now))});
  if(url.pathname==='/cast'){
   const f=s.game.hunt.field;
   s.game.gameClass.skills=[{...s.game.gameClass.skills[1],name:'Whirlwind',l2Id:9,tier:undefined,cost:10,cooldown:2}];s.game.hotbar=[0];
   Object.assign(f,{x:.5,y:.5});Object.assign(f.mobs[0],{x:.51,y:.5,currentHp:1});Object.assign(f.mobs[1],{x:.52,y:.51,currentHp:1});
   assert.ok(useHuntSkill(s,0,{now,random:()=>0}).queued);now+=721;f.seenAt=now;advanceHunt(s,now,()=>0);
   return route.fulfill({contentType:'application/json',body:'{}'});
  }
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 for(const [zone,artEnvironment] of (expansion?SCENE_STUDIES.filter(s=>s.category==='hunting').map(s=>[s.id,s.environment]):[['catacomb-forbidden-path','catacomb'],['necropolis-disciples','necropolis'],['hot-springs','springs'],['outlaw-forest','woodland'],['blazing-swamp','volcanic'],['swamp-of-screams','marsh'],['hellbound','desert'],['giants-cave','cavern'],['wall-of-argos','desert']]).filter(([,env])=>!process.env.COMBAT_ENV||env===process.env.COMBAT_ENV)){
  prepare(zone);const environment=(await getHuntState(s,now)).field.environment;await page.evaluate(()=>{document.querySelector('.system-toasts')?.remove();return openRoom();});await page.waitForSelector('.hunt-phaser-ready canvas');
  assert.ok(await page.evaluate(async environment=>{
   const {paintedProp,paintedStoneFloor}=await import('/room-props-art.js');
   return Boolean(paintedProp('rock',environment)&&(!['catacomb','necropolis','ice'].includes(environment)||paintedStoneFloor()));
  },artEnvironment),'painted assets load rather than silently using the fallback');
  assert.equal((await getHuntState(s,now)).field.environment,environment);
  assert.ok(await page.evaluate(async ({environment,zone})=>{
   const {paintedRoomScene}=await import('/room-scene-art.js');const compact=document.querySelector('.hunt-ground').clientWidth<480,image=paintedRoomScene(environment,{compact,sceneKey:zone});
   return image?.naturalWidth===(compact?768:1536)&&image.naturalHeight===(compact?512:1024);
  },{environment,zone}),'full room illustration loads at the intended size');
  if(width===320&&zone==='catacomb-forbidden-path'){
   await page.setViewportSize({width:1100,height:900});
   await page.waitForFunction(async()=>{
    const {paintedRoomScene}=await import('/room-scene-art.js');
    return document.querySelector('.hunt-ground').clientWidth>=480&&paintedRoomScene('catacomb')?.naturalWidth===1536;
   });
   await page.setViewportSize({width,height:900});
   await page.waitForFunction(async()=>{
    const {paintedRoomScene}=await import('/room-scene-art.js');
    return document.querySelector('.hunt-ground').clientWidth<480&&paintedRoomScene('catacomb',{compact:true})?.naturalWidth===768;
   });
  }
  const size=await page.locator('.hunt-ground').evaluate(async()=>{const {isoMatrix}=await import('/hunt-isometric.js');const n=document.querySelector('.hunt-ground');return {width:n.clientWidth,room:isoMatrix({width:n.clientWidth,height:n.clientHeight}).a*2};});
  assert.ok(size.room>size.width,'room extends beyond the viewport and can be explored with pan');
  const paint=await page.evaluate(async field=>{
   const {paintRoom}=await import('/room-paint.js'),{isoPoint}=await import('/hunt-isometric.js');
   const n=document.querySelector('.hunt-ground'),viewport={width:n.clientWidth,height:n.clientHeight},r=paintRoom(field,viewport),p=isoPoint({x:.95,y:.5},viewport);
   return {pixels:r.floor.width*r.floor.height,alpha:r.floor.getContext('2d').getImageData(Math.round(p.x-r.bounds.x),Math.round(p.y-r.bounds.y),1,1).data[3],padded:n.querySelector('canvas').width>n.clientWidth};
  },{environment:s.game.hunt.field?environment:null,walls:s.game.hunt.field.walls,sceneKey:zone});
  assert.ok(paint.alpha>0&&paint.padded,'offscreen ground remains painted when panning');assert.ok(paint.pixels<1600000,'room texture stays bounded on wide screens');
  assert.equal(await page.locator('.hunt-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
  if(width===390){
   await page.screenshot({path:`docs/combat-${expansion?'expansion-'+zone:zone==='wall-of-argos'?'wall-of-argos':environment}-390.png`});
   const overview=await page.evaluate(async field=>{
    const {paintRoom}=await import('/room-paint.js');const {loadRoomScene}=await import('/room-scene-art.js');
    await loadRoomScene(field.environment,{sceneKey:field.sceneKey});const r=paintRoom(field,{width:760,height:1000});
    const output=document.createElement('canvas');output.width=r.floor.width;output.height=r.floor.height;
    const c=output.getContext('2d');c.drawImage(r.floor,0,0);
    for(const prop of r.props.sort((a,b)=>a.depth-b.depth))c.drawImage(prop.canvas,prop.x-r.bounds.x,prop.y-r.bounds.y);
    return output.toDataURL('image/png').split(',')[1];
   },{environment,walls:s.game.hunt.field.walls,sceneKey:zone});
   fs.writeFileSync(`docs/location-${expansion?'expansion-'+zone:zone==='wall-of-argos'?'wall-of-argos':environment}-full.png`,Buffer.from(overview,'base64'));
  }
  if(zone==='catacomb-forbidden-path'){
   await page.evaluate(()=>fetch('/cast'));await page.waitForSelector('.hunt-skill-fx.physical .hunt-fx-impact');
   await page.waitForFunction(()=>document.querySelector('[data-chat-preview]')?.textContent.includes('Вы получили'));
   assert.equal(await page.locator('.system-toast').count(),0,'loot goes into chat without obscuring the room');
   const hit=await page.locator('.hunt-skill-fx').textContent();assert.match(hit,/Whirlwind/);
   if(width===390)await page.screenshot({path:'docs/combat-loot-skill-390.png'});
   await page.locator('[data-bar-edit]').click();await page.locator('[data-last-loot]').click();await page.waitForSelector('.loot-notice-overlay.visible');
   assert.equal(await page.locator('.loot-notice-items .ui-content-row').count(),s.game.hunt.lastLoot.items.length,'all actual loot remains available without covering combat');
   assert.equal(await page.locator('.loot-notice-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
   await page.waitForTimeout(220);
   if(width===390)await page.screenshot({path:'docs/combat-loot-details-390.png'});
   await page.locator('.loot-notice-overlay [data-dismiss]').click();await page.waitForSelector('.loot-notice-overlay',{state:'detached'});
   await page.locator('[data-last-loot]').click();await page.waitForSelector('.loot-notice-overlay.visible');
   await page.keyboard.press('Escape');await page.waitForSelector('.loot-notice-overlay',{state:'detached'});
   await page.locator('[data-bar-cancel]').click();
  }
  await page.locator('[data-dismiss]').click();await page.waitForSelector('.hunt-overlay',{state:'detached'});
 }
 for(const name of (expansion?Object.keys(epicEnvironments):['antharas','valakas','baium','zaken','freya']).filter(name=>!process.env.COMBAT_ENV||epicEnvironments[name]===process.env.COMBAT_ENV)){
  await page.evaluate(name=>showBoss(name),name);await page.waitForSelector('.boss-room-stage .hunt-phaser-ready canvas');
  await page.waitForFunction(()=>document.querySelectorAll('.boss-room-stage .hunt-avatar-painted').length===2);
  assert.ok(await page.evaluate(async ({name,environment})=>{
   const {paintedRoomScene}=await import('/room-scene-art.js');
   return Boolean(paintedRoomScene(environment,{sceneKey:name,compact:document.querySelector('.hunt-ground').clientWidth<480}));
  },{name,environment:epicEnvironments[name]}),'boss arenas use the corresponding full scene');
  assert.equal(await page.locator('[data-room-boss-hp]').textContent(),'88%');
  await page.evaluate(()=>bossEffect());assert.equal(await page.locator('[data-room-effect] .hunt-fx-impact').count(),1);
  if(width===390&&name==='antharas'){
   await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>bossEffect());
   assert.ok(await page.locator('[data-room-effect]').evaluate(n=>n.getAnimations({subtree:true}).length>0),'visible effects animate without reduced motion');
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
   assert.equal(await page.locator('[data-room-effect]').count(),0,'hidden boss rooms cancel transient effects');
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.emulateMedia({reducedMotion:'reduce'});
  }
  assert.equal(await page.locator('.boss-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
  if(width===390)await page.screenshot({path:`docs/combat-boss-${name}-390.png`});
  await page.evaluate(()=>closeBoss());assert.equal(await page.locator('.hunt-phaser canvas').count(),0);
 }
 assert.equal(assetReads.get('/art/world/room-props-v1.webp'),1,'one shared prop atlas across hunting and boss rooms');
 if(!process.env.COMBAT_ENV||['catacomb','necropolis','ice'].includes(process.env.COMBAT_ENV))assert.equal(assetReads.get('/art/world/crypt-floor-v1.webp'),1,'stone texture is loaded once');
 if(width===390&&!process.env.COMBAT_ENV&&!expansion){
  const gallery=await page.evaluate(async()=>{
   const rows=[['volcanic','Blazing Swamp'],['catacomb','Катакомбы'],['necropolis','Некрополь'],['woodland','Лес'],['marsh','Болото'],['springs','Горячие источники'],['desert','Пустыня'],['cavern','Пещера'],['ship','Корабль'],['ice','Ледяной дворец'],['argos','Стена Аргоса']];
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=2640;const c=canvas.getContext('2d');
   c.fillStyle='#100f14';c.fillRect(0,0,1200,2640);
   const {roomSceneUrl}=await import('/room-scene-art.js');
   for(let i=0;i<rows.length;i++){
    const [key,label]=rows[i],image=new Image();
    image.src=roomSceneUrl(key==='argos'?'desert':key,{compact:true,sceneKey:({volcanic:'blazing-swamp',springs:'hot-springs',woodland:'outlaw-forest',argos:'wall-of-argos'})[key]||key});await image.decode();
    const x=(i%2)*600,y=Math.floor(i/2)*440;
    c.drawImage(image,x+8,y+8,584,389);c.fillStyle='#ead7a6';c.font='24px Georgia';c.fillText(label,x+16,y+426);
   }
   return canvas.toDataURL('image/png').split(',')[1];
  });
  fs.writeFileSync('docs/location-designs-overview.png',Buffer.from(gallery,'base64'));
 }
 assert.deepEqual(errors,[]);await page.close();console.log(`Combat rooms ${width}px${process.env.COMBAT_ENV?' '+process.env.COMBAT_ENV:''}: full scene art, combat effects, boss arenas and cleanup passed`);
}}finally{await browser.close();}
