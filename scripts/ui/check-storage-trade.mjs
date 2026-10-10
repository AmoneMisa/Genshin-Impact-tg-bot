import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {moveWarehouse,warehouseDto} from '../../miniapp/warehouse.js';
import {actTrade,tradeState} from '../../miniapp/trade.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp');
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
function fixture(){return {members:[1,2,3].map(userId=>({userId,userChatData:{user:{first_name:userId===1?'White Amorality':'Moonlight'}},game:{inventory:{gold:33000,crystals:1650,ironOre:165,materials:{craft_gem_S:12,lifestone_high_S:3},equipment:{items:[{uid:'mace'+userId,name:'Arcana Mace',mainType:'weapon',kind:'mace',grade:'S',enchant:7,sa:{type:'Acumen',level:13}}]},potions:{items:[{id:'hp',type:'hp',size:'medium',count:20}]}}}})),game:{}};}
try {for(const width of [320,390,1100]){
 const chat=fixture(),clan={owner:1,members:[{userId:1,role:'owner'},{userId:2,role:'officer'},{userId:3,role:'member'}],warehouse:{gold:2e6,materials:{craft_gem_S:30}}};
 const page=await browser.newPage({viewport:{width,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url()),p=chat.members[0];
  if(url.pathname==='/api/warehouse')return route.fulfill({json:warehouseDto(p,clan,url.searchParams.get('scope'))});
  if(url.pathname==='/api/warehouse/transfer'){
   const body=route.request().postDataJSON(),result=moveWarehouse(p,clan,body);
   return route.fulfill({json:{...result,warehouse:warehouseDto(p,clan,body.scope)}});
  }
  if(url.pathname==='/api/trade')return route.fulfill({json:tradeState(chat,1)});
  if(url.pathname==='/api/trade/action'){
   const result=actTrade(chat,1,route.request().postDataJSON());return route.fulfill({json:{...result,tradeState:tradeState(chat,1)}});
  }
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(()=>{window.demoApi=async(url,options)=>{const result=await fetch(url,{headers:{'Content-Type':'application/json'},...options});return result.json();};});
 for(const scope of ['character','clan']){
  await page.evaluate(async scope=>{const {openWarehouseGame}=await import('/warehouse.js');await openWarehouseGame({api:demoApi,scope,haptic:()=>{}});},scope);
  await page.locator('[data-stock-index="0"]').click();
  await page.locator('.stock-quantity input').fill('100');
  await page.locator('.stock-quantity button[type=submit]').click();
  await page.locator('[data-storage-feedback]').filter({hasText:'Предметы переданы.'}).waitFor();
  assert.equal(scope==='clan'?clan.warehouse.gold:chat.members[0].game.warehouse.gold,scope==='clan'?2000100:100);
  await page.locator('[data-direction=withdraw]').click();
  await page.locator('[data-stock-index="0"]').click();
  await page.locator('.stock-quantity input').fill('50');
  await page.locator('.stock-quantity button[type=submit]').click();
  await page.locator('.stock-quantity').waitFor({state:'detached'});
  await page.waitForFunction(()=>document.querySelector('[data-storage-feedback]').textContent==='Предметы переданы.');
  assert.equal(scope==='clan'?clan.warehouse.gold:chat.members[0].game.warehouse.gold,scope==='clan'?2000050:50);
  assert.equal(await page.locator('.storage-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
  assert.equal(await page.locator('.stock-grid').first().evaluate(n=>getComputedStyle(n).scrollbarColor),'rgb(155, 123, 67) rgb(16, 13, 22)');
  assert.equal(await page.locator('[data-storage-body] input').count(),0);
  assert.equal(await page.locator('.stock-slot img').first().evaluate(n=>n.getBoundingClientRect().width),48);
  assert.equal(await page.locator('[data-stock-index]').first().evaluate(n=>getComputedStyle(n).borderWidth),'0px');
  await page.locator('.stock-slot img').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));
  assert.ok(await page.locator('.stock-slot img').count()>0);
  if(width===390)await page.locator('.storage-panel').screenshot({path:`docs/${scope}-warehouse-390.png`});
  const balance=scope==='clan'?clan.warehouse.gold:chat.members[0].game.warehouse.gold;
  await page.locator('[data-stock-index="0"]').click();
  if(width===390&&scope==='character')await page.locator('.stock-quantity').screenshot({path:'docs/stock-quantity-390.png'});
  await page.locator('[data-quantity-cancel]').click();
  assert.equal(scope==='clan'?clan.warehouse.gold:chat.members[0].game.warehouse.gold,balance);
  await page.locator('.storage-panel .overlay-close').click();
 }
 const requested=actTrade(chat,1,{action:'request',targetId:2});
 actTrade(chat,2,{action:'join',id:requested.tradeId});
 const t=chat.game.trades[0];actTrade(chat,2,{action:'offer',id:t.id,revision:t.revision,items:[{kind:'equipment',ref:'mace2',count:1}]});
 await page.evaluate(async()=>{const {openTradeGame}=await import('/trade.js');await openTradeGame({api:demoApi,haptic:()=>{}});});
 await page.locator('[data-trade-inventory] [data-stock-index="0"]').click();
 await page.locator('.stock-quantity input').fill('100');
 await page.locator('.stock-quantity button[type=submit]').click();
 await page.locator('[data-my-offer] .stock-slot img').waitFor();
 await page.locator('[data-trade-confirm]').click();
 await page.locator('[data-my-offer] .trade-ready.on').waitFor();
 assert.equal(t.status,'active');
 assert.equal(await page.locator('.storage-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
 await page.locator('.stock-slot img').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));
 if(width===390){
  await page.addStyleTag({content:'.trade-overlay{position:static!important;height:auto!important;max-height:none!important}.trade-panel{position:static!important;height:auto!important;max-height:none!important;overflow:visible!important}.overlay-backdrop{display:none!important}body{overflow:visible!important}'});
  await page.locator('.storage-panel').screenshot({path:'docs/player-trade-390.png'});
 }
 assert.equal(actTrade(chat,2,{action:'confirm',id:t.id,revision:t.revision}).completed,true);
 await page.locator('[data-trade-peer]').first().waitFor();
 assert.equal(chat.members[0].game.inventory.equipment.items.length,2);
 assert.deepEqual(errors,[]);await page.close();console.log(`Warehouse deposits/withdrawals and two-player trade verified at ${width}px`);
}}finally{await browser.close();}
