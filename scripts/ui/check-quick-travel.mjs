import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {worldState,worldAction,ensureWorld} from '../../functions/game/world/world.js';import {respawnWorld,deathChoices} from '../../functions/game/world/death.js';
import change from '../../functions/game/player/changePlayerGameClass.js';import update from '../../functions/game/player/updatePlayerStats.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE));const {chromium}=require('playwright');const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp');const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>'<link rel="stylesheet" href="'+m[1]+'">').join('');fs.mkdirSync('docs/quick-travel',{recursive:true});
try{for(const width of [320,390,820]){
 const hero={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:80},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{}}};change(hero,'warrior');update(hero);ensureWorld(hero);hero.game.gameClass.stats.hp=0;
 const state=()=>{const world=worldState(hero);if(world.death)world.death.choices=deathChoices(hero,null);return {...world,holdings:[],corpses:[],shop:null};};
 const page=await browser.newPage({viewport:{width,height:950}}),errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const url=new URL(route.request().url());
 if(url.pathname==='/api/world/action'){const b=route.request().postDataJSON();calls.push(b);const result=b.action==='respawn'?respawnWorld(hero,b.destination,null):worldAction(hero,b);return route.fulfill({json:{...result,world:state()}});}
 if(url.pathname==='/api/world')return route.fulfill({json:{world:state()}});
 if(url.pathname==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
 if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<link rel="stylesheet" href="/world-map.css"><body></body>'});
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
 return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(async()=>{
 const api=async(url,options)=>(await fetch(url,{headers:{'Content-Type':'application/json'},...options})).json();window.fixtureApi=api;
 const {installOverlayA11y}=await import('/overlay-a11y.js');installOverlayA11y();const {updateDeathPopup}=await import('/death-popup.js');
 updateDeathPopup({dead:true,world:(await api('/api/world')).world,api,onResolved:()=>{document.querySelector('.hunt-overlay').remove();}});
 const hunt=document.createElement('section');hunt.className='game-overlay hunt-overlay visible';hunt.innerHTML='<button>Охота</button>';document.body.append(hunt);
 });
 await page.locator('[data-respawn="city"]').click();await page.waitForSelector('.death-overlay',{state:'detached'});assert.equal(hero.game.gameClass.stats.hp,1);assert.equal(hero.game.world.mode,'city');
 await page.evaluate(async()=>{const {bindFeatureLinks}=await import('/feature-links.js');bindFeatureLinks(document,{openFeature:async()=>{const {openWorldMap}=await import('/world-map.js');await openWorldMap({api:window.fixtureApi,haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span')});}});document.body.insertAdjacentHTML('beforeend','<button data-open-feature="hunt">Атлас</button>');});
 await page.locator('[data-open-feature="hunt"]').click();await page.waitForSelector('.atlas-panel');await page.locator('[data-quick-menu]').click();await page.waitForSelector('[data-quick-go]');
 await page.locator('.atlas-popup').screenshot({path:'docs/quick-travel/menu-'+width+'.png'});
 await page.locator('[data-quick-tab="hunting"]').click();assert.ok(await page.locator('[data-quick-level]').count()>1);assert.ok(await page.locator('[data-quick-go]').count()>10);
 await page.locator('[data-quick-level="76"]').click();await page.locator('.atlas-popup').screenshot({path:'docs/quick-travel/hunting-'+width+'.png'});
 await page.locator('[data-quick-tab="catacombs"]').click();assert.ok(await page.locator('[data-quick-go]').count()>0);assert.match(await page.locator('.quick-travel-list').innerText(),/Катакомбы/);
 await page.locator('.atlas-popup').screenshot({path:'docs/quick-travel/catacombs-'+width+'.png'});
 await page.locator('[data-quick-tab="cities"]').click();
 const before=hero.game.inventory.gold;await page.locator('[data-quick-go]').first().click();await page.waitForFunction(()=>document.querySelector('.atlas-popup').hidden);assert.ok(calls.some(b=>b.action==='quick_travel'));assert.equal(hero.game.inventory.gold,before-60000);assert.deepEqual(hero.game.world.path,[]);
 await page.locator('[data-close]').click();await page.waitForSelector('.atlas-overlay',{state:'detached'});assert.deepEqual(errors,[]);assert.equal(await page.locator('body [inert]').count(),0);
 console.log('PASS clickable death return, dynamic Atlas link and instant paid teleport '+width+'px');await page.close();
}}finally{await browser.close();}
