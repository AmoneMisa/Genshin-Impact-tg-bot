import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {worldState,worldAction,advanceWorld} from '../../functions/game/world/world.js';
import {SETTLEMENTS,SETTLEMENT_NPCS} from '../../template/worldSettlements.js';
import holdings from '../../template/worldHoldings.js';
import {arriveHoldingEntrance} from '../../functions/game/world/holdingEntry.js';
import {hallAction,hallState} from '../../functions/game/world/hall.js';
import change from '../../functions/game/player/changePlayerGameClass.js';
import update from '../../functions/game/player/updatePlayerStats.js';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/world-settlements-ui');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const width of [320,390,1100]){
 const s={userId:1,game:{stats:{lvl:80},inventory:{gold:1e7,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{}}};change(s,'humanFighter');update(s);
 const clan={_id:'c'},h=holdings.find(h=>h.kind==='hall'&&h.region==='giran'),record={owner:{clanId:'c'}};let now=Date.now();
 s.game.world={mode:'city',city:'floran',x:.5,y:.5,path:[],moveAt:now,locks:{}};
 const dto=()=>({world:{...worldState(s,now),holdings:holdings.map(row=>({...row,canEnter:row.id===h.id,owner:row.id===h.id?record.owner:null})),corpses:[],...(s.game.world.mode==='hall'?{hall:hallState(s,clan,h,record,now)}:{})}});
 const errors=[],loaded=new Set(),page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/world')return route.fulfill({json:dto()});
  if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/world/action'){now+=30000;advanceWorld(s,now);const b=route.request().postDataJSON(),r=b.action.startsWith('hall_')?hallAction(s,clan,h,record,b,now):worldAction(s,b,now);return route.fulfill({status:r.ok?200:409,json:{...r,...dto()}});}
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  if(u.endsWith('.webp'))loaded.add(u);
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://settlements.local/fixture');
 await page.evaluate(async()=>{await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();window.fixtureApi=async(url,opts)=>{const r=await fetch(url,opts),data=await r.json();if(!r.ok){const e=new Error(data.reason);e.payload=data;throw e;}return data;};window.openAtlas=()=>import('/world-map.js').then(m=>m.openWorldMap({api:window.fixtureApi}));await window.openAtlas();});
 await page.locator('[data-mode="city"]').click();
 for(const city of SETTLEMENTS){
  await page.getByRole('combobox',{name:'Регион',exact:true}).click();await page.getByRole('option',{name:city.name,exact:true}).click();
  await page.locator('[data-city-view]').click();await page.waitForFunction(()=>document.querySelector('.atlas-popup img')?.naturalWidth>0);
  assert.match(await page.locator('.atlas-popup img').getAttribute('src'),new RegExp('city-'+city.id));
  assert.equal(await page.locator('.atlas-popup').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
  await page.keyboard.press('Escape');
 }
 await page.waitForTimeout(200);assert.ok([...loaded].some(u=>/\/l2\/.*\.webp/.test(u)));
 const city=SETTLEMENTS.find(c=>c.id==='kamael-village'),npc=SETTLEMENT_NPCS.find(n=>n.city===city.id),box=await page.locator('canvas').boundingBox();
 await page.locator('canvas').click({position:{x:box.width/2+(npc.x-city.x)*box.width/city.size,y:box.height/2+(npc.y-city.y)*box.width/city.size}});
 if(await page.locator('[data-group]').count())await page.locator('[data-group]').first().click();
 assert.equal(await page.locator('[data-approach]').count(),1);await page.keyboard.press('Escape');
 assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.screenshot({path:path.join(out,'settlements-'+width+'.png')});await page.locator('[data-close]').click();
 arriveHoldingEntrance(s,h,now);assert.equal(hallAction(s,clan,h,record,{action:'hall_enter'},now).ok,true);
 await page.evaluate(()=>window.openAtlas());await page.waitForTimeout(200);
 await page.locator('[data-interior-objects]').click();await page.locator('[data-room-node]').first().click();await page.locator('[data-approach]').click();
 assert.ok(s.game.world.path.length);
 await page.locator('[data-interior-objects]').click();await page.locator('[data-room-exit]').click();await page.locator('[data-door-approach]').click();
 await page.locator('[data-interior-objects]').click();await page.locator('[data-room-exit]').click();await page.locator('[data-door-leave]').click();
 assert.equal(s.game.world.mode,'entrance');assert.equal(s.game.world.entryOrigin.x,h.entry.x);
 await page.locator('[data-close]').click();
 if(width===320){arriveHoldingEntrance(s,h,now);hallAction(s,clan,h,record,{action:'hall_enter'},now);await page.evaluate(async()=>{HTMLCanvasElement.prototype.getContext=()=>null;await window.openAtlas();});await page.locator('[data-interior-objects]').click();await page.locator('[data-room-exit]').click();assert.equal(await page.locator('[data-door-leave]').isEnabled(),true);await page.locator('[data-door-leave]').click();assert.equal(s.game.world.mode,'entrance');await page.locator('[data-close]').click();}
 assert.deepEqual(errors,[]);assert.equal(await page.locator('[inert]').count(),0);await page.close();console.log('PASS settlements '+width+': eight previews, original tiles, hall walk/exit, no overflow, fallback and cleanup');
}}finally{await browser.close();}
