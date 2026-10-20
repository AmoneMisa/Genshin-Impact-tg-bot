import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {worldState,cityPoint,CITIES,ensureWorld} from '../../functions/game/world/world.js';
import {GRACIA_CITIES,GRACIA_NPCS,ISHUMA_UNSEAL} from '../../template/graciaTravel.js';
import {getEquipmentState,performEquipmentAction} from '../../miniapp/equipment.js';
import change from '../../functions/game/player/changePlayerGameClass.js';
import update from '../../functions/game/player/updatePlayerStats.js';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/missing-world-ui');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const width of [320,390,1100]){
 const s={userId:1,game:{stats:{lvl:80},inventory:{gold:1e9,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{}}};change(s,'humanFighter');update(s);ensureWorld(s);
 const row=ISHUMA_UNSEAL.find(r=>r.name==='Elegia Breastplate');s.game.inventory.materials['l2_'+row.source]=1;
 const npc=GRACIA_NPCS.find(n=>n.service==='ishuma'),city=CITIES.find(c=>c.id===npc.city);
 Object.assign(s.game.world,{city:city.id,...cityPoint(city,npc)});
 const errors=[],calls=[],page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<500});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url()),u=url.pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  if(u==='/api/world')return route.fulfill({json:{world:{...worldState(s),holdings:[],corpses:[]}}});
  if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/equipment')return route.fulfill({json:getEquipmentState(s,{serviceNpc:url.searchParams.get('serviceNpc')})});
  if(u==='/api/equipment/action'){const b=route.request().postDataJSON();calls.push(b);const r=performEquipmentAction(s,b.key,b.action,b);return route.fulfill({status:r.ok?200:409,json:r});}
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://missing.local/fixture');
 await page.evaluate(async()=>{
  await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();
  window.api=async(url,options)=>{const r=await fetch(url,options),p=await r.json();if(!r.ok)throw Object.assign(new Error(p.reason),{payload:p});return p;};
  window.atlas=()=>import('/world-map.js').then(m=>m.openWorldMap({api:window.api}));await window.atlas();
 });
 await page.locator('[data-mode="city"]').click();
 for(const c of GRACIA_CITIES){
  await page.getByRole('combobox',{name:'Регион',exact:true}).click();await page.getByRole('option',{name:c.name,exact:true}).click();
  assert.equal(await page.locator('[data-city-view]').count(),0);
  assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 }
 await page.getByRole('combobox',{name:'Показать на карте'}).click();await page.getByRole('option',{name:'Грация · обзор',exact:true}).click();
 assert.equal(await page.locator('.atlas-popup figure').count(),4);await page.keyboard.press('Escape');
 assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.screenshot({path:path.join(out,'gracia-'+width+'.png')});await page.locator('[data-close]').click();
 await page.evaluate(()=>import('/forge.js').then(m=>m.openForgeGame({api:window.api,serviceNpc:'ishuma'})));
 assert.equal(await page.locator('[data-forge-mode]').count(),1);assert.equal(await page.locator('[data-open-book]').count(),0);
 await page.locator('[data-forge-select]').click();assert.equal(await page.locator('[data-unseal]').isEnabled(),true);
 assert.equal(await page.locator('dialog[open]').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.screenshot({path:path.join(out,'ishuma-'+width+'.png')});await page.locator('[data-unseal]').click();
 await page.getByRole('button',{name:'Подтвердить',exact:true}).click();await page.waitForFunction(()=>document.body.innerText.includes('Доспехи распечатаны.'));
 assert.equal(calls.length,1);assert.equal(calls[0].serviceNpc,'ishuma');assert.equal(s.game.inventory.equipment.items.at(-1).l2Id,row.product);
 await page.locator('.equipment-overlay .overlay-close').first().click();assert.equal(await page.locator('[inert],dialog[open]').count(),0);
 assert.deepEqual(errors,[]);await page.close();console.log('PASS missing world '+width+': Gracia cities, atlas filter, Ishuma output, fee, confirmation, focus cleanup');
}}finally{await browser.close();}
