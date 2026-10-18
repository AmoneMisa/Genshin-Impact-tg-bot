import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {HUNT_EXPLORATION} from '../../template/huntExploration.js';
import {enterHuntField,moveHuntField,advanceHunt} from '../../functions/game/hunt/huntFight.js';
import {getHuntState} from '../../miniapp/hunt.js';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import updateStats from '../../functions/game/player/updatePlayerStats.js';

const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/exploration/ui');fs.mkdirSync(out,{recursive:true});
const selectedZones=process.env.EXPLORATION_ZONES?.split(',').filter(Boolean);
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const cases=[{width:320,mode:'auto'},{width:390,mode:'auto'},{width:1100,mode:'auto'},{width:320,mode:'canvas'},{width:320,mode:'unavailable'},{width:320,mode:'missing-art'}].filter(c=>(!process.env.EXPLORATION_WIDTH||c.width===Number(process.env.EXPLORATION_WIDTH))&&(!process.env.EXPLORATION_MODE||c.mode===process.env.EXPLORATION_MODE));
try{for(const {width,mode} of cases){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<500}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(mode==='canvas')await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
 let s,now;
 const quiet=()=>s.game.hunt.field.mobs.forEach(m=>{m.aggressive=false;m.aggro=false;m.nextAttackAt=now+1e6;});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url()),u=url.pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><script type="module">
   import {openHuntGame} from '/hunt.js';
   window.openRoom=()=>openHuntGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>{const r=await fetch(url,options);return r.json();}});
  </script></body>`});
  if(u==='/vendor/phaser/phaser.esm.min.js')return route.fulfill(mode==='unavailable'?{status:404}:{contentType:'text/javascript',body:fs.readFileSync('node_modules/phaser/dist/phaser.esm.min.js')});
  if(u==='/api/hunt')return route.fulfill({json:await getHuntState(s,now)});
  if(u==='/api/hunt/move'){
   quiet();const body=route.request().postDataJSON(),result=moveHuntField(s,body.direction||body.point,now);
   assert.ok(result.ok);now+=20000;s.game.hunt.field.seenAt=now;advanceHunt(s,now,()=>.5);quiet();
   return route.fulfill({json:{hunt:await getHuntState(s,now)}});
  }
  if(mode==='missing-art'&&u.startsWith('/art/world/scenes/'))return route.fulfill({status:404});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://exploration.local/fixture');
 const zones=HUNT_EXPLORATION.filter(z=>(!process.env.EXPLORATION_ZONE||z.id===process.env.EXPLORATION_ZONE)&&(!selectedZones||selectedZones.includes(z.id))&&(mode==='auto'||selectedZones||z.id===(process.env.EXPLORATION_ZONE||'plains-of-dion')));
 assert.ok(zones.length,'At least one exploration zone must be checked');
 for(const {id} of zones){
  now=Date.now();s={userId:1,game:{stats:{lvl:80,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
  changeClass(s,'humanFighter');updateStats(s);assert.ok(enterHuntField(s,id,{now,random:()=>.5}).ok);quiet();
  const original=s.game.hunt.field.mobs.map(m=>m.instanceId);
  await page.evaluate(()=>openRoom());await page.waitForSelector('.hunt-ground');
  if(mode!=='unavailable')await page.waitForSelector('.hunt-phaser-ready canvas');
  async function check(){
   const dto=await getHuntState(s,now);
   assert.equal(await page.locator('.hunt-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,id+' overflow');
   assert.match(await page.locator('#hunt-heading').getAttribute('title'),new RegExp(dto.field.room.landmark));
   assert.ok(await page.locator('.hunt-iso-actor[data-hunt-halt]').count());
   if(!['unavailable','missing-art'].includes(mode))await page.waitForFunction(async field=>{
    const {paintedRoomScene}=await import('/room-scene-art.js');const compact=document.querySelector('.hunt-ground').clientWidth<480;
    const image=paintedRoomScene(field.environment,{sceneKey:field.sceneKey,compact});return image?.naturalWidth===(compact?768:1536);
   },dto.field);
   if(mode==='unavailable')assert.match(await page.locator('.hunt-isometric-terrain image').first().getAttribute('href'),new RegExp(dto.field.room.id==='r0c0'?id:id+'-area-'));
  }
  async function go(room,viaExit=false){
   // Navigate using the same accessible local map, then keep the entry actor in view.
   if(viaExit){
    const arrow=page.locator('.hunt-exit[data-room="'+room+'"]'),a=await arrow.boundingBox(),g=await page.locator('.hunt-ground').boundingBox();
    const cx=g.x+g.width/2,cy=g.y+g.height*.42;
    await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+(cx-a.x-a.width/2),cy+(cy-a.y-a.height/2),{steps:8});await page.mouse.up();
    await arrow.click();
   }else{
    await page.locator('[data-bar-edit]').click();
    if(await page.locator('[data-combat-details="rooms"]').getAttribute('open')===null)await page.locator('[data-combat-details="rooms"]>summary').click();
    await page.locator('.hunt-map [data-room="'+room+'"]').click();await page.locator('[data-bar-cancel]').click();
   }
   assert.equal(s.game.hunt.field.room,room);await check();
   const self=await page.locator('.hunt-iso-actor[data-hunt-halt]').boundingBox(),ground=await page.locator('.hunt-ground').boundingBox();
   assert.ok(self.x+self.width/2>ground.x&&self.x+self.width/2<ground.x+ground.width&&self.y+self.height/2>ground.y&&self.y+self.height/2<ground.y+ground.height,'entry actor visible');
  }
  await check();await go('r0c1',true);
  if(mode==='auto')await page.screenshot({path:path.join(out,id+'-east-'+width+'.png')});
  await go('r0c0');assert.deepEqual(s.game.hunt.field.mobs.map(m=>m.instanceId),original);
  await go('r1c0');if(mode==='auto')await page.screenshot({path:path.join(out,id+'-south-'+width+'.png')});
  assert.equal((await getHuntState(s,now)).field.map.rooms.filter(r=>r.visited).length,3);
  await page.locator('.hunt-overlay [data-dismiss]').first().click();await page.waitForSelector('.hunt-overlay',{state:'detached'});
  assert.equal(await page.locator('[inert],.hunt-phaser canvas').count(),0);
 }
 assert.deepEqual(errors,[]);await page.close();console.log(`PASS exploration ${width}px ${mode}: ${zones.length} zones, walking, distinct art, return, camera and cleanup`);
}}finally{await browser.close();}
