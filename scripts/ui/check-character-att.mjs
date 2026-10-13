import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {getCharacterState} from '../../miniapp/character.js';
import {attributeInfo} from '../../functions/game/equipment/attributes.js';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import updateStats from '../../functions/game/player/updatePlayerStats.js';
const root=path.resolve('webapp'),require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE));
const {chromium}=require('playwright'),browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),file=>fs.readFileSync(path.join(root,file.slice(1)),'utf8'));
const styles=assets.bundles.map(b=>`<link rel="stylesheet" href="${b.path}">`).join('');
const hero={userId:1,game:{stats:{lvl:80,currentExp:0},inventory:{gold:1e6,materials:{attr_stone_fire:10},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{}}};
changeClass(hero,'warrior');hero.game.tattoos=[{dye:4445}];updateStats(hero);
const items=[
 {key:'valid',name:'Valid weapon',mainType:'weapon',grade:'S',custom:true,kind:'sword'},
 {key:'wrong',name:'Other element',mainType:'weapon',grade:'S',custom:true,kind:'sword',attribute:{element:'water',value:20}},
 {key:'full',name:'Stone limit',mainType:'weapon',grade:'S',custom:true,kind:'sword',attribute:{element:'fire',value:150}},
 {key:'low',name:'A grade',mainType:'weapon',grade:'A',custom:true,kind:'sword'},
].map(i=>({...i,attribute:attributeInfo(hero,i)}));
fs.mkdirSync('docs/item-metadata',{recursive:true});
try{for(const width of [320,390,1100]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  const bundle=assets.bundles.find(b=>b.path===url.pathname);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture');
 await page.evaluate(async snapshot=>{await(await import('/character.js')).openCharacterPage({api:async()=>snapshot,haptic:()=>{},renderState:()=>{}});},getCharacterState(hero));
 await page.locator('.character-symbols img').waitFor();assert.match(await page.locator('[data-base-stat="STR"]').textContent(),/\+1/);assert.match(await page.locator('[data-base-stat="CON"]').textContent(),/-3/);
 await page.locator('[data-base-stat="STR"]').focus();assert.equal(await page.locator('[data-base-stat="STR"]').evaluate(el=>el===document.activeElement),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`docs/item-metadata/character-${width}.png`});
 await page.locator('.character-overlay .overlay-close').click();
 await page.evaluate(async equipment=>{await(await import('/forge.js')).openForgeGame({api:async()=>equipment,materialKey:'attr_stone_fire'});},{items});
 assert.equal(await page.locator('[data-forge-select]').count(),4);
 for(const key of ['wrong','full','low'])assert.equal(await page.locator(`[data-forge-select="${key}"]`).isDisabled(),true);
 assert.equal(await page.locator('[data-forge-select="valid"]').isDisabled(),false);
 await page.locator('[data-forge-select="valid"]').click();await page.locator('.forge-service-dialog').waitFor();
 await page.locator('.forge-service-dialog [data-dismiss]').click();assert.equal(await page.locator('.forge-service-dialog').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`docs/item-metadata/att-${width}.png`});
 await page.locator('.equipment-overlay .overlay-close').click();assert.equal(await page.locator('.equipment-overlay').count(),0);
 assert.deepEqual(errors,[]);await page.close();console.log(`PASS symbols, stat deltas, ATT eligibility, focus, dialogs and layout ${width}px`);
}}finally{await browser.close();}
