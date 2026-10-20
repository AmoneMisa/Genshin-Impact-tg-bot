import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {worldState,worldAction,advanceWorld,ensureWorld,cityPoint,CITIES} from '../../functions/game/world/world.js';
import {GRACIA_NPCS} from '../../template/graciaTravel.js';
import change from '../../functions/game/player/changePlayerGameClass.js';
import update from '../../functions/game/player/updatePlayerStats.js';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/airship-ui');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const reverse of [false,true])for(const {width,noCanvas=false} of [{width:320},{width:390},{width:1100},{width:320,noCanvas:true}]){
 let now=1800000000000;
 const origin=reverse?'keucereus-alliance-base':'gludio-airship-field',destination=reverse?'gludio-airship-field':'keucereus-alliance-base';
 const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 change(s,'humanFighter');update(s);ensureWorld(s,now);
 const npc=GRACIA_NPCS.find(n=>n.city===origin&&n.service==='airship');
 Object.assign(s.game.world,{city:origin,z:npc.z},cityPoint(CITIES.find(c=>c.id===origin),npc));
 assert.equal(worldAction(s,{action:'travel_city',city:destination},now).ok,true);advanceWorld(s,now+1000);
 const trip=s.game.world.walkHome;now=trip.departureAt-1000;
 const dto=()=>({world:{...worldState(s,now),holdings:[],corpses:[]}}),errors=[],calls=[],requests=[];
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,reducedMotion:width===390?'no-preference':'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 if(noCanvas)await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;requests.push(u);
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/world')return route.fulfill({json:dto()});
  if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/world/action'){const body=route.request().postDataJSON();calls.push(body);const result=worldAction(s,body,now);return route.fulfill({status:result.ok?200:409,json:{...result,...dto()}});}
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://airship.local/fixture');
 await page.evaluate(async()=>{
  await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();
  const api=async(url,opts)=>{const response=await fetch(url,opts),data=await response.json();if(!response.ok){const e=new Error(data.reason);e.payload=data;throw e;}return data;};
  await(await import('/world-map.js')).openWorldMap({api,haptic:()=>{},renderState:()=>{}});
 });
 if(!noCanvas)assert.match(await page.locator('.atlas-status').textContent(),/Ожидание отправления/);
 await page.locator('[data-movement]').click();assert.equal(await page.locator('[data-native-stop]').count(),0);
 assert.equal(await page.locator('.atlas-popup').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.keyboard.press('Escape');
 if(!noCanvas){await page.locator('canvas').click({position:{x:10,y:10}});assert.equal(calls.length,0);}
 now=trip.departureAt+12000;s.game=JSON.parse(JSON.stringify(s.game));
 await page.waitForResponse(async r=>r.url().includes('/api/world?live=1')&&(await r.json()).world.player.transportPhase==='flying');
 if(!noCanvas)await page.waitForFunction(()=>document.querySelector('.atlas-status')?.textContent==='Полёт воздушного корабля');
 assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.screenshot({path:path.join(out,`${reverse?'return':'outward'}-${width}${noCanvas?'-fallback':''}.png`)});
 now=trip.until;
 await page.waitForResponse(async r=>r.url().includes('/api/world?live=1')&&(await r.json()).world.player.mode==='city');
 const name=CITIES.find(c=>c.id===destination).name;
 if(!noCanvas)await page.waitForFunction(name=>document.querySelector('.atlas-status')?.textContent==='Вы в '+name,name);
 assert.equal(s.game.world.city,destination);assert.equal(s.game.inventory.gold,1000000);
 await page.locator('.atlas-panel [data-dismiss]').first().click();await page.waitForSelector('.atlas-panel',{state:'detached'});
 assert.equal(await page.locator('[inert],dialog[open]').count(),0);
 const count=requests.length;await page.waitForTimeout(2200);assert.equal(requests.length,count);
 assert.equal(requests.some(u=>u.includes('l2j-geodata')||u.endsWith('.gz')),false);assert.deepEqual(errors,[]);
 await page.close();console.log(`PASS airship ${origin} -> ${destination} ${width}${noCanvas?' noCanvas':''}`);
}}finally{await browser.close();}
