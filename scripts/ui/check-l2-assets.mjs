// Exercise the actual merchant, inventory and party screens with original L2 assets.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {getMerchantsState} from '../../miniapp/merchants.js';
import {getInventoryState} from '../../miniapp/inventory.js';
import {getPartyState} from '../../miniapp/party.js';
import {createParty} from '../../functions/game/party/party.js';
import changePlayerGameClass from '../../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../../functions/game/player/updatePlayerStats.js';
import {addMaterial} from '../../functions/game/player/materials.js';
import {L2_MATERIAL_ART,L2_JEWELRY_ART,L2_ITEM_IDENTITIES,L2_CATEGORY_ART,L2_UI_ART} from '../../webapp/art/l2-icon-art.js';
const root=path.resolve('webapp');
const art=new Set([...Object.values(L2_MATERIAL_ART),...Object.values(L2_JEWELRY_ART),...Object.values(L2_ITEM_IDENTITIES),...Object.values(L2_CATEGORY_ART),...Object.values(L2_UI_ART)]);
for(const key of art)for(const size of [128,256,512]){
 const file=path.join(root,'art/l2',`${key}-${size}.webp`);assert.ok(fs.existsSync(file),file);
 const bytes=fs.readFileSync(file);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
}
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
const session={userId:1,userChatData:{user:{id:1,first_name:'Хранитель'}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:5e6,ancientAdena:9e6,crystals:100,ironOre:100,materials:{},equipment:{items:[]},potions:{items:[{type:'hp',size:'small',bottleType:'potion',count:3,power:1000,name:'Зелье HP'}]}},effects:[],builds:{},respawnTime:0}};
changePlayerGameClass(session,'mage');updatePlayerStats(session);
for(const key of ['scroll_A','blessed_S','craft_gem_D','seal_red','soul_blue_17','lifestone_top_S','attr_crystal_dark','l2_5965','l2_12374','l2_2133','l2_2134','l2_1','l2_1787'])addMaterial(session,key,10);
const chat={members:[session]};session.ownerDocument=()=>chat;createParty(chat,session);
try{
 const gallery=await browser.newPage({viewport:{width:390,height:900}});
 await gallery.goto(pathToFileURL(path.resolve('docs/l2-assets-preview.html')).href);
 const crystals=gallery.locator('section').filter({has:gallery.getByRole('heading',{name:'Кристаллы души SA — все уровни 0–17',exact:true})});
 assert.equal(await crystals.locator('figure').count(),54);
 for(const colour of ['Красный','Синий','Зелёный'])for(let stage=0;stage<=17;stage++)assert.equal(await crystals.getByText(`${colour} SA · уровень ${stage}`,{exact:true}).count(),1);
 await gallery.evaluate(async()=>{for(const image of document.images)await image.decode();});
 assert.equal(await gallery.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'gallery overflow');
 await crystals.screenshot({path:'docs/l2-sa-all-levels-390.png'});
 await gallery.close();
 console.log('Gallery: 54 SA crystals (three colours, levels 0–17), every image decoded');
 for(const width of [320,390,1100]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[],missing=[];
  page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.route('**/*',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">${styles}</head><body><div id="status"></div></body></html>`});
   if(pathname.startsWith('/api/')){
    const query=route.request().postDataJSON()||{};
    const data=pathname==='/api/merchants'?getMerchantsState(session,query):pathname==='/api/inventory'?getInventoryState(session):pathname==='/api/party'?getPartyState(session):null;
    return route.fulfill({status:data?200:404,contentType:'application/json',body:JSON.stringify(data)});
   }
   const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'Missing'});
   return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://127.0.0.1:4321/fixture.html');
  await page.evaluate(async()=>{window.opts={api:async(p,o)=>{const r=await fetch(p,o);return r.json();},haptic:()=>{},renderState:()=>{},statusElement:document.querySelector('#status')};const {openMerchantsGame}=await import('/merchants.js');await openMerchantsGame(window.opts);});
  for(const merchant of ['weapons','armor','jewelry','alchemist','mammon']){
   await page.locator(`[data-tab="${merchant}"]`).click();
   await page.waitForFunction(name=>document.querySelector('.merchant-banner')?.src.includes('/'+name+'-'),merchant);
   await page.locator('.merchant-banner').evaluate(image=>image.decode());
   await page.evaluate(async()=>{for(const image of document.querySelectorAll('img')){image.loading='eager';await image.decode();}});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'merchant overflow '+width);
   const overflow=await page.locator('.merchants-panel').evaluate(n=>({wide:n.scrollWidth>n.clientWidth,offenders:[...n.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>n.getBoundingClientRect().right+1).map(e=>({class:e.className,width:e.getBoundingClientRect().width,text:e.textContent.slice(0,50)})).slice(0,8)}));
   if(overflow.wide){await page.screenshot({path:'.tmp/l2-merchant-overflow.png'});console.log(await page.locator('.shop-categories').evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth,overflow:getComputedStyle(n).overflowX,display:getComputedStyle(n).display,panelWidth:n.parentElement.clientWidth,panelScroll:n.parentElement.scrollWidth})));}
   assert.equal(overflow.wide,false,'merchant panel overflow '+width+' '+JSON.stringify(overflow.offenders));
   if(width===390)await page.locator('.merchants-panel').screenshot({path:`docs/l2-merchant-${merchant}-390.png`});
  }
  await page.evaluate(()=>document.querySelector('.game-overlay').remove());
  await page.evaluate(async()=>{const {openInventoryGame}=await import('/inventory.js');await openInventoryGame(window.opts);});
  await page.waitForFunction(()=>document.querySelector('.inventory-overlay').classList.contains('visible'));
  assert.ok(await page.locator('.inventory-material-group summary img').count()>5);
  await page.evaluate(async()=>{for(const image of document.querySelectorAll('img')){image.loading='eager';await image.decode();}});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'inventory overflow '+width);
  if(width===390)await page.locator('.inventory-panel').screenshot({path:'docs/l2-inventory-390.png'});
  await page.evaluate(()=>document.querySelector('.game-overlay').remove());
  await page.evaluate(async()=>{const {openPartyGame}=await import('/party.js');await openPartyGame(window.opts);});
  await page.waitForFunction(()=>document.querySelector('.party-overlay').classList.contains('visible'));
  assert.equal(await page.locator('[data-party-loot] img').count(),3);
  await page.evaluate(async()=>{for(const image of document.querySelectorAll('img')){image.loading='eager';await image.decode();}});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'party overflow '+width);
  assert.equal(await page.locator('.party-panel').evaluate(n=>n.scrollWidth>n.clientWidth),false,'party panel overflow '+width);
  if(width===390)await page.locator('.party-panel').screenshot({path:'docs/l2-party-390.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await page.close();
  console.log(`${width}px: five merchant banners, inventory groups, party modes; no missing images or overflow`);
 }
 console.log(`${art.size} original icons, ${Object.keys(L2_MATERIAL_ART).length} material keys, ${Object.keys(L2_JEWELRY_ART).length} jewels verified`);
}finally{await browser.close();}
