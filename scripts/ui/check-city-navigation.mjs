import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {worldState,worldAction,CITIES,CITY_NPCS} from '../../functions/game/world/world.js';
import {findCityPath} from '../../functions/game/world/cityNavigation.js';
import change from '../../functions/game/player/changePlayerGameClass.js';
import update from '../../functions/game/player/updatePlayerStats.js';
const root=path.resolve('webapp'),out=path.resolve('.tmp/city-navigation-ui');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const width of [320,390,1100]){
 let now=1800000000000;
 const s={userId:1,game:{stats:{lvl:85},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'giran',x:.5,y:.5,path:[],moveAt:now,locks:{}}}};
 change(s,'humanFighter');update(s);
 const dto=()=>({world:{...worldState(s,now),holdings:[],corpses:[]}}),errors=[],requests=[];
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;requests.push(u);
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/world'){if(s.game.world.cityWalk)now+=1000;return route.fulfill({json:dto()});}
  if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/world/action'){
   const result=worldAction(s,route.request().postDataJSON(),now);return route.fulfill({status:result.ok?200:409,json:{...result,...dto()}});
  }
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://city.local/fixture');
 await page.evaluate(async()=>{await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();const api=async(url,opts)=>{const response=await fetch(url,opts),data=await response.json();if(!response.ok)throw Object.assign(new Error(data.reason),{payload:data});return data;};window.openAtlas=()=>import('/world-map.js').then(m=>m.openWorldMap({api}));await window.openAtlas();});
 await page.locator('[data-mode="city"]').click();
 assert.equal(await page.locator('[data-city-view]').count(),0);assert.equal(await page.locator('.atlas-popup').isVisible(),false);
 await page.waitForTimeout(500);
 assert.ok(requests.some(u=>/\/l2\/22_22(?:-mobile)?\.webp$/.test(u)),'original Giran map tile is displayed');
 const city=CITIES.find(c=>c.id==='giran'),box=await page.locator('canvas').boundingBox();
 const target=[[4000,0],[-4000,0],[0,4000],[0,-4000],[3500,3500],[-3500,-3500]].map(([dx,dy])=>({x:.5+dx/14000,y:.5+dy/14000})).find(p=>{
  if(CITY_NPCS.some(n=>n.city==='giran'&&Math.hypot(n.x-(city.x+(p.x-.5)*14000),n.y-(city.y+(p.y-.5)*14000))*box.width/14000<48))return false;
  return findCityPath({...s.game.world},city,p)?.length;
 });assert.ok(target,'an unobstructed town click exists away from NPC markers');
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.action==='move'),page.locator('canvas').click({position:{x:box.width*target.x,y:box.height/2+(target.y-.5)*box.width}})]);
 assert.ok(s.game.world.cityWalk,'a canvas click creates a source-checked city journey');
 await page.waitForTimeout(2300);assert.ok(Math.hypot(s.game.world.x-.5,s.game.world.y-.5)>0,'the server advances the actual town position');
 assert.equal(s.game.world.mode,'city');assert.ok(Number.isFinite(s.game.world.z));
 assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.screenshot({path:path.join(out,`giran-${width}.png`)});
 await page.locator('[data-close]').click();assert.equal(await page.locator('.atlas-overlay').count(),0);assert.deepEqual(errors,[]);
 await page.close();console.log(`PASS Giran ${width}: original map, no preview, native town click, server movement, focus cleanup`);
}}finally{await browser.close();}
