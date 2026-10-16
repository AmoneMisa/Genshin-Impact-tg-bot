import {worldBossList} from '../../functions/game/boss/epicBosses.js';
import {getHuntState} from '../../miniapp/hunt.js';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {worldState,worldAction,ensureWorld,CITIES,LOCATIONS} from '../../functions/game/world/world.js';
import change from '../../functions/game/player/changePlayerGameClass.js';
import update from '../../functions/game/player/updatePlayerStats.js';

const root=path.resolve('webapp'),out=path.resolve('.tmp/atlas-design');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const {chromium}=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE))('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
try{for(const width of [320,390,820]){
 const hero={userId:1,game:{stats:{lvl:47},inventory:{gold:1000000,materials:{scroll_escape:2},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{}}};
 change(hero,'warrior');update(hero);ensureWorld(hero);hero.game.world.city='dion';
 const dto=()=>({world:{...worldState(hero),holdings:[],corpses:[]}}),calls=[],errors=[];
 const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url()),u=url.pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/hunt')return route.fulfill({json:await getHuntState(hero)});
  if(u==='/api/world')return route.fulfill({json:dto()});
  if(u==='/api/boss/epic')return route.fulfill({json:{bosses:worldBossList().filter(b=>b.name==='queenAnt')}});
  if(u==='/api/boss/summon'){calls.push({action:'boss_entry',...route.request().postDataJSON()});return route.fulfill({status:409,json:{reason:'epic_cooldown'}});}
  if(u==='/api/hunt/loot'){calls.push({action:'loot'});return route.fulfill({json:{mobs:[{name:'Монстр',level:33,drops:[]}]}});}
  if(u==='/api/world/action'){const body=route.request().postDataJSON();calls.push(body);const result=worldAction(hero,body);return route.fulfill({status:result.ok?200:409,json:{...result,...dto()}});}
  const bundle=assets.bundles?.find(a=>a.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://design.local/fixture');
 await page.evaluate(async()=>{
  await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();
  const api=async(url,options)=>{const r=await fetch(url,options),data=await r.json();if(!r.ok){const error=new Error(data.reason);error.payload=data;throw error;}return data;};
  window.fixtureApi=api;await(await import('/world-map.js')).openWorldMap({api,haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span')});
 });
 await page.waitForTimeout(250);
 assert.equal(await page.locator('[data-shops],[data-fight],.atlas-hint').count(),0);
 assert.equal(await page.locator('.atlas-panel').evaluate(p=>p.scrollWidth<=p.clientWidth+1),true);
 await page.screenshot({path:path.join(out,'map-'+width+'.png')});
 await page.locator('[data-mode="city"]').click();await page.locator('[data-city-view]').click();
 await page.waitForFunction(()=>document.querySelector('.atlas-popup img')?.naturalWidth>0);
 assert.match(await page.locator('.atlas-popup img').getAttribute('src'),/city-dion-mobile-v1/);
 assert.equal(await page.locator('.atlas-popup').evaluate(p=>p.scrollWidth<=p.clientWidth+1),true);
 await page.screenshot({path:path.join(out,'city-scene-'+width+'.png')});await page.locator('.atlas-popup [data-dismiss]').click();
 assert.equal(await page.locator('.atlas-popup').isVisible(),false);
 await page.locator('[data-mode="region"]').click();assert.equal(await page.locator('[data-city-view]').isVisible(),false);
 await page.getByRole('combobox',{name:'Показать на карте'}).click();await page.getByRole('option',{name:'Грация · обзор',exact:true}).click();
 assert.equal(await page.locator('.atlas-popup figure').count(),4);assert.match(await page.locator('.atlas-popup').innerText(),/Маршруты и точки входа пока не добавлены/);
 assert.equal(await page.locator('.atlas-popup [data-quick-go],.atlas-popup [data-location-quick]').count(),0);
 for(const img of await page.locator('.atlas-popup img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(img=>img.decode());}
 assert.equal(await page.locator('.atlas-popup').evaluate(p=>p.scrollWidth<=p.clientWidth+1),true);
 await page.screenshot({path:path.join(out,'gracia-scene-'+width+'.png')});await page.keyboard.press('Escape');
 assert.equal(await page.locator('.atlas-popup').isVisible(),false);assert.equal(calls.length,0,'art previews do not trigger travel');
 await page.getByRole('button',{name:'Правила',exact:true}).click();assert.equal(await page.locator('.game-rules-tooltip').count(),1);await page.keyboard.press('Escape');assert.equal(await page.locator('.game-rules-tooltip').count(),0);
 await page.getByRole('combobox',{name:'Показать на карте'}).click();await page.getByRole('option',{name:'Катакомбы и некрополи',exact:true}).click();
 const location=LOCATIONS.find(l=>l.region==='dion'&&l.id.startsWith('catacomb-')&&!l.instance),city=CITIES.find(c=>c.id==='dion');
 const box=await page.locator('canvas').boundingBox();
 await page.locator('canvas').click({position:{x:box.width/2+(location.x-city.x)*box.width/100000,y:box.height/2+(location.y-city.y)*box.width/100000}});
 await page.locator('[data-location-quick]').waitFor();assert.equal(calls.filter(c=>c.action==='loot').length,0);
 await page.screenshot({path:path.join(out,'location-'+width+'.png')});
 await page.locator('[data-loot]>summary').click();await page.waitForFunction(()=>document.querySelector('[data-drops]')?.textContent.includes('Монстр'));assert.equal(calls.filter(c=>c.action==='loot').length,1);
 await page.locator('[data-location-quick]').click();assert.equal(await page.locator('[data-quick-confirm]').isEnabled(),true);
 await page.screenshot({path:path.join(out,'travel-selected-'+width+'.png')});
 const before=hero.game.inventory.gold;await page.locator('[data-quick-confirm]').click();await page.locator('.hunt-overlay').waitFor();await page.waitForSelector('.atlas-overlay',{state:'detached'});assert.ok(hero.game.inventory.gold<before);assert.equal(hero.game.world.location,location.id);
 assert.equal(await page.getByText('Зоны',{exact:true}).count(),0);assert.equal(await page.getByText(/Последняя добыча:/).count(),0);await page.locator('.hunt-overlay [data-dismiss]').click();await page.waitForSelector('.hunt-overlay',{state:'detached'});
 await page.evaluate(async()=>await(await import('/world-map.js')).openWorldMap({api:window.fixtureApi}));
 await page.locator('[data-movement]').click();await page.locator('[data-movement-tab="scroll"]').click();assert.equal(await page.locator('[data-escape]').isEnabled(),true);assert.equal(await page.locator('[data-leave]').count(),1);
 await page.locator('.atlas-popup [data-back]').click();assert.equal(await page.locator('.atlas-popup').isVisible(),false);
 await page.getByRole('combobox',{name:'Показать на карте'}).click();await page.getByRole('option',{name:'Эпические боссы',exact:true}).click();
 await page.locator('[data-movement]').click();await page.getByRole('combobox',{name:'Разделы телепорта'}).click();await page.getByRole('option',{name:'Эпические боссы',exact:true}).click();await page.locator('[data-quick-go]').first().click();assert.equal(await page.locator('[data-quick-confirm]').isEnabled(),true);await page.locator('[data-quick-confirm]').click();await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/Босс ещё не вернулся/);assert.ok(calls.some(c=>c.action==='boss_entry'&&c.epic==='queenAnt'&&c.teleport===true));await page.locator('.atlas-popup [data-back]').click();
 await page.keyboard.press('Alt+b');await page.locator('[data-quick-confirm]').waitFor();assert.equal(await page.locator('[data-quick-confirm]').isDisabled(),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('.atlas-popup').isVisible(),false);
 await page.keyboard.press('Escape');await page.waitForSelector('.atlas-overlay',{state:'detached'});assert.equal(await page.locator('[inert]').count(),0);assert.deepEqual(errors,[]);
 if(width===320){
  await page.evaluate(async()=>{HTMLCanvasElement.prototype.getContext=()=>null;await(await import('/world-map.js')).openWorldMap({api:window.fixtureApi});});
  assert.match(await page.locator('.atlas-status').innerText(),/Карта недоступна/);
  await page.locator('[data-mode="city"]').click();await page.locator('[data-city-view]').click();await page.waitForFunction(()=>document.querySelector('.atlas-popup img')?.naturalWidth>0);await page.keyboard.press('Escape');
  await page.locator('[data-movement]').click();await page.locator('[data-quick-go]').first().click();assert.equal(await page.locator('[data-quick-confirm]').isEnabled(),true);
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.waitForSelector('.atlas-overlay',{state:'detached'});assert.deepEqual(errors,[]);
 }
 await page.close();console.log('PASS atlas '+width+': map tools, location sheet, lazy loot, quoted teleport, scroll, keyboard, focus cleanup');
}}finally{await browser.close();}
